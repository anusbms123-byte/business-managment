export const checkPermission = (moduleName, action) => {
    const savedPermissions = sessionStorage.getItem('permissions');
    if (!savedPermissions) return false;

    try {
        const permissions = JSON.parse(savedPermissions);
        const modulePermission = permissions.find(p => p.module.toLowerCase() === moduleName.toLowerCase());

        if (!modulePermission) return false;

        switch (action) {
            case 'view':
                return modulePermission.can_view === 1;
            case 'create':
                return modulePermission.can_create === 1;
            case 'edit':
                return modulePermission.can_edit === 1;
            case 'delete':
                return modulePermission.can_delete === 1;
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
