# **How to Apply Permission-Based UI Controls**

## **Quick Reference**

```javascript
import { canCreate, canEdit, canDelete, canView } from '../utils/permissions';
```

---

## **Example 1: Conditionally Show Buttons**

### **Before** (No permission check)
```javascript
<button onClick={handleCreate}>
    Add New Product
</button>

<button onClick={handleEdit}>
    Edit
</button>

<button onClick={handleDelete}>
    Delete  
</button>
```

### **After** (With permission check)
```javascript
import { canCreate, canEdit, canDelete } from '../utils/permissions';

function ProductsComponent() {
    const hasCreatePerm = canCreate('Products');
    const hasEditPerm = canEdit('Products');
    const hasDeletePerm = canDelete('Products');

    return (
        <div>
            {/* Only show button if user has permission */}
            {hasCreatePerm && (
                <button onClick={handleCreate}>
                    Add New Product
                </button>
            )}

            {/* In table rows: */}
            <table>
                {products.map(product => (
                    <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>
                            {hasEditPerm && (
                                <button onClick={() => handleEdit(product)}>
                                    Edit
                                </button>
                            )}
                            {hasDeletePerm && (
                                <button onClick={() => handleDelete(product)}>
                                    Delete
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </table>
        </div>
    );
}
```

---

## **Example 2: Filter Menu Items by Permission**

### **Sidebar/Navigation**
```javascript
import { canAccessModule } from '../utils/permissions';

const menuItems = [
    { name: 'Dashboard', path: '/', module: 'Dashboard' },
    { name: 'Products', path: '/inventory', module: 'Products' },
    { name: 'Sales', path: '/sales', module: 'Sales' },
    { name: 'Customers', path: '/customers', module: 'Customers' },
];

function Sidebar() {
    // Filter menu to show only accessible modules
    const accessibleMenu = menuItems.filter(item => 
        canAccessModule(item.module)
    );

    return (
        <nav>
            {accessibleMenu.map(item => (
                <Link key={item.path} to={item.path}>
                    {item.name}
                </Link>
            ))}
        </nav>
    );
}
```

---

## **Example 3: Disable Form Inputs**

```javascript
import { canEdit } from '../utils/permissions';

function ProductForm({ product }) {
    const canEditProduct = canEdit('Products');

    return (
        <form>
            <input 
                type="text" 
                value={product.name}
                disabled={!canEditProduct}  // Disable if no edit permission
            />
            
            <button 
                type="submit"
                disabled={!canEditProduct}  // Disable submit
            >
                Save Changes
            </button>
        </form>
    );
}
```

---

## **Example 4: Show Different UI for Different Roles**

```javascript
import { getCurrentUserRole } from '../utils/permissions';

function Settings() {
    const userRole = getCurrentUserRole();

    return (
        <div>
            {/* Everyone can see basic settings */}
            <BasicSettings />

            {/* Only Admin and Super Admin see this */}
            {(userRole === 'Admin' || userRole === 'Super Admin') && (
                <AdvancedSettings />
            )}

            {/* Only Super Admin sees this */}
            {userRole === 'Super Admin' && (
                <SystemManagement />
            )}
        </div>
    );
}
```

---

## **Module Names Reference**

Use these exact module names (case-sensitive):

- `"Dashboard"`
- `"Products"` (for Inventory)
- `"Sales"`
- `"Purchases"`
- `"Customers"`
- `"Vendors"` (Suppliers)
- `"Expenses"`
- `"Returns"`
- `"HRM"`
- `"Accounting"`
- `"Backup"`
- `"Reports"`

---

## **Available Permission Functions**

### **Basic Checks**
```javascript
canView(moduleName)    // Can user view this module?
canCreate(moduleName)  // Can user create new records?
canEdit(moduleName)    // Can user edit existing records?
canDelete(moduleName)  // Can user delete records?
```

### **Module Access**
```javascript
canAccessModule(moduleName)  // Does user have ANY permission in this module?
```

### **Utilities**
```javascript
getCurrentCompanyId()   // Get current user's company ID
getCurrentUserRole()    // Get current user role (Admin, Manager, etc.)
getAllPermissions()     // Get all permissions for debugging
```

---

## **Common Patterns**

### **Pattern 1: Action Buttons**
```javascript
{canCreate('Sales') && <button>New Sale</button>}
{canEdit('Sales') && <button>Edit Sale</button>}
{canDelete('Sales') && <button>Delete Sale</button>}
```

### **Pattern 2: Bulk Actions**
```javascript
const actions = [
    { label: 'Create', handler: handleCreate, permission: canCreate('Products') },
    { label: 'Edit', handler: handleEdit, permission: canEdit('Products') },
    { label: 'Delete', handler: handleDelete, permission: canDelete('Products') },
];

return (
    <div>
        {actions.filter(a => a.permission).map(action => (
            <button key={action.label} onClick={action.handler}>
                {action.label}
            </button>
        ))}
    </div>
);
```

### **Pattern 3: Protected Route**
```javascript
import { canAccessModule } from '../utils/permissions';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, moduleName }) {
    if (!canAccessModule(moduleName)) {
        return <Navigate to="/" replace />;
    }
    return children;
}

// Usage:
<Route 
    path="/sales" 
    element={
        <ProtectedRoute moduleName="Sales">
            <Sales />
        </ProtectedRoute>
    } 
/>
```

---

## **Testing Checklist**

- [ ] Admin creates role "Sales Agent" with only Sales view permission
- [ ] Admin creates user with "Sales Agent" role
- [ ] Login as Sales Agent
- [ ] Verify user CANNOT see "Add Sale" button
- [ ] Verify user CANNOT see "Edit" or "Delete" buttons in Sales table
- [ ] Verify user CAN view sales data
- [ ] Verify sidebar only shows modules user has access to

---

## **Important Notes**

1. ✅ **Super Admin** and **Admin** bypass ALL permission checks
2. ✅ Permission checks are **cached in sessionStorage** during login
3. ✅ Module names are **case-insensitive** in the utility (`'products' === 'Products'`)
4. ⚠️ Always check permissions **before** rendering sensitive UI
5. ⚠️ Backend also validates permissions - frontend checks are for UX only

---

**Last Updated**: 2026-02-07
