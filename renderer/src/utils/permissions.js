export const checkPermission = (moduleName, action) => {
    const savedPermissions = sessionStorage.getItem('permissions');
    const userRole = sessionStorage.getItem('userRole');

    // Super Admin respects DB, but Admin (Company Owner) has full local access
    if (userRole === 'Admin' || userRole === 'admin') {
        return true;
    }


    if (!savedPermissions) return false;

    try {
        const permissions = JSON.parse(savedPermissions);
        const modulePermission = permissions.find(p => p.module.toLowerCase() === moduleName.toLowerCase());

        if (!modulePermission) return false;

        switch (action) {
            case 'view':
                return modulePermission.can_view == 1 || modulePermission.canView === true || modulePermission.canView === 1 || modulePermission.can_view === true;
            case 'create':
                return modulePermission.can_create == 1 || modulePermission.canCreate === true || modulePermission.canCreate === 1 || modulePermission.can_create === true;
            case 'edit':
                return modulePermission.can_edit == 1 || modulePermission.canEdit === true || modulePermission.canEdit === 1 || modulePermission.can_edit === true;
            case 'delete':
                return modulePermission.can_delete == 1 || modulePermission.canDelete === true || modulePermission.canDelete === 1 || modulePermission.can_delete === true;
            default:
                return false;
        }
    } catch (error) {
        console.error("Permission check error:", error);
        return false;
    }
};

export const canView = (module) => checkPermission(module, 'view');
export const canCreate = (module) => checkPermission(module, 'create');
export const canEdit = (module) => checkPermission(module, 'edit');
export const canDelete = (module) => checkPermission(module, 'delete');

// Helper to check if module is accessible at all (has any permission)
export const canAccessModule = (moduleName) => {
    // Super Admin check removed


    return canView(moduleName);
};

// Helper to get all permissions for debugging
export const getAllPermissions = () => {
    try {
        const savedPermissions = sessionStorage.getItem('permissions');
        return savedPermissions ? JSON.parse(savedPermissions) : [];
    } catch (error) {
        console.error("Error parsing permissions:", error);
        return [];
    }
};

// Helper to get current user's company ID
export const getCurrentCompanyId = () => {
    return sessionStorage.getItem('companyId');
};

// Helper to get current user's role
export const getCurrentUserRole = () => {
    return sessionStorage.getItem('userRole');
};
