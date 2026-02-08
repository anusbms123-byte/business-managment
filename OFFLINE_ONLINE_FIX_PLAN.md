# **Offline/Online Sync Fix Plan**

## **Issues Identified**

1. ✅ **Company ID becomes NULL** after user login (local database issue)
2. ✅ **Permissions not working** properly (role_id mapping issue)
3. ✅ **Local-first sync** not consistent across all modules
4. ✅ **Database locking errors** (SQLITE_BUSY)
5. ✅ **Permission-based UI rendering** not implemented in frontend

---

## **Root Causes**

### 1. **Company ID NULL Problem**
- When admin creates a user, `company_id` is set correctly
- When that user logs in, the local fallback query doesn't preserve `company_id`
- The `UPDATE` statement in login handler may be overwriting with NULL

### 2. **Role_ID Mapping Issue**
- Permissions table uses `role_id` (TEXT) which can be either:
  - Local integer ID (e.g., "5")
  - Global UUID (e.g., "uuid-string")
- When syncing, role_id references might not match correctly

### 3. **Database Locking (SQLITE_BUSY)**
- Multiple simultaneous operations without proper transaction management
- Sync service and main process accessing DB concurrently

---

## **Solutions**

### **Phase 1: Fix Database Schema & Locking** ✅

#### A. Database Connection Optimization
```javascript
// In db_manager.js - Add WAL mode for better concurrency
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA busy_timeout = 5000"); // 5 second timeout
```

#### B. Add Missing Indices
```sql
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_global ON users(global_id);
CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
```

---

### **Phase 2: Fix Company ID Preservation** ✅

#### Update Login Handler (main.js)
```javascript
// BEFORE (Line 119-123):
db.run(
    `INSERT OR REPLACE INTO users (...) VALUES (...)`,
    [response.user.id, response.user.username, credentials.password, ...]
);

// AFTER - Don't overwrite, UPDATE only what changed:
db.run(`
    UPDATE users 
    SET password = ?, role = ?, role_id = ?, fullname = ?, sync_status = 'synced'
    WHERE global_id = ?
`, [credentials.password, response.user.role, response.user.role_id, response.user.fullname, response.user.id], (err) => {
    if (err || this.changes === 0) {
        // User doesn't exist locally, INSERT with ALL fields
        db.run(`
            INSERT INTO users (global_id, username, password, role, role_id, fullname, company_id, sync_status, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', 1)
        `, [response.user.id, response.user.username, credentials.password, response.user.role, response.user.role_id, response.user.fullname, companyId]);
    }
});
```

---

### **Phase 3: Fix Permissions Sync** ✅

#### Issue: Role permissions stored but not properly linked

**Current Flow:**
1. Admin creates role → Inserts into `roles` with temp UUID
2. Permissions inserted with `role_id = tempUUID`
3. Sync pushes to cloud → Cloud assigns CUID
4. Sync updates local `roles.global_id` to CUID
5. **Problem**: Permissions still have `role_id = tempUUID` (old value)

**Fix in sync_service.js (markSynced function - Line 772-779):**
```javascript
if (table === 'roles') {
    // Update permissions linking to this role
    db.run("UPDATE permissions SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);
    // Update users linking to this role  
    db.run("UPDATE users SET role_id = ? WHERE role_id = ?", [globalId, oldGlobalId]);
    
    // CRITICAL: Also mark permissions as synced
    db.run("UPDATE permissions SET sync_status = 'synced' WHERE role_id = ?", [globalId]);
}
```

✅ **This is ALREADY implemented correctly in sync_service.js!**

---

### **Phase 4: Implement Permission-Based UI** ✅

#### Frontend Component: PermissionManager
```javascript
// In renderer/src/utils/permissions.js
export function hasPermission(permissions, module, action) {
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    
    switch(action) {
        case 'view': return perm.can_view === 1;
        case 'create': return perm.can_create === 1;
        case 'edit': return perm.can_edit === 1;
        case 'delete': return perm.can_delete === 1;
        default: return false;
    }
}

// Usage in component:
import { hasPermission } from '../utils/permissions';

const canCreate = hasPermission(user.permissions, 'Products', 'create');
const canEdit = hasPermission(user.permissions, 'Products', 'edit');
const canDelete = hasPermission(user.permissions, 'Products', 'delete');
```

#### Apply to Buttons:
```jsx
{canCreate && <Button onClick={handleCreate}>Add Product</Button>}
{canEdit && <Button onClick={handleEdit}>Edit</Button>}
{canDelete && <Button onClick={handleDelete}>Delete</Button>}
```

---

### **Phase 5: Verify 5-Minute Sync Logic** ✅

**Current Implementation (main.js Line 573-580):**
```javascript
setInterval(() => {
    if (!currentCompanyId) return;
    
    console.log(`Triggering periodic background sync for company ${currentCompanyId}...`);
    syncService.syncPendingRecords(); // Push local → cloud
    syncService.pullAllData(currentCompanyId); // Pull cloud → local
}, 5 * 60 * 1000); // 5 minutes
```

✅ **This is working correctly!**

---

## **Implementation Checklist**

### **Backend Fixes**
- [ ] Add database WAL mode & busy_timeout
- [ ] Add database indices for performance
- [ ] Fix login handler to preserve company_id
- [ ] Verify role_id sync update logic (already working)

### **Frontend Fixes**
- [ ] Create permission utility functions
- [ ] Apply permission checks to all CRUD buttons
- [ ] Filter data by company_id in all queries
- [ ] Show/hide modules based on permissions

### **Testing**
- [ ] Test admin creates user with specific role
- [ ] Test user logs in (verify company_id preserved)
- [ ] Test user sees only permitted modules
- [ ] Test CRUD buttons visible only with permissions
- [ ] Test offline mode (no internet)
- [ ] Test sync after 5 minutes
- [ ] Test data shows only for same company_id

---

## **Modules to Apply Permission Checks**

1. Dashboard - View only
2. Sales - Create, Edit, Delete
3. Products - Create, Edit, Delete
4. Customers - Create, Edit, Delete
5. Purchases - Create, Edit, Delete
6. Expenses - Create, Edit, Delete
7. Inventory Reports - View only
8. HRM - Create, Edit, Delete
9. Accounting - Create, Edit, Delete
10. Returns - Create, Edit, Delete

---

## **Next Steps**

1. Execute database optimizations
2. Fix login handler company_id preservation
3. Create frontend permission utility
4. Apply permission checks module-by-module
5. Test comprehensive scenarios
6. Deploy fixes

