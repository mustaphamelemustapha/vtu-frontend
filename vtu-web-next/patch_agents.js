const fs = require('fs');
const file = 'src/app/(admin)/admin/agents/page.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
const importsToAdd = `
import { 
  adminActivateUser, 
  adminDeleteUser, 
  adminGetUserDetails, 
  adminSuspendUser, 
  adminUpdateUserRole 
} from '@/lib/api';
`;
content = content.replace("import {\n  adminGetAgents,\n} from '@/lib/api';", `import {\n  adminGetAgents,\n  adminActivateUser,\n  adminDeleteUser,\n  adminGetUserDetails,\n  adminSuspendUser,\n  adminUpdateUserRole\n} from '@/lib/api';`);

// 2. Add openUser and runAction before columns = useMemo
const functionsToAdd = `
  const openUser = useCallback(async (user) => {
    setSelectedUser(user);
    setSelectedDetails(null);
    try {
      const details = await adminGetUserDetails(user.id);
      setSelectedDetails(details);
    } catch {
      setSelectedDetails({ user, wallet: { balance: 0 }, recent_transactions: [] });
    }
  }, []);

  const runAction = useCallback(async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction.type === 'suspend') {
        await adminSuspendUser(confirmAction.user.id);
      } else if (confirmAction.type === 'delete') {
        await adminDeleteUser(confirmAction.user.id);
      } else if (['set_customer', 'set_agent', 'set_ambassador'].includes(confirmAction.type)) {
        const newRole = confirmAction.type.replace('set_', '');
        await adminUpdateUserRole({ 
          user_id: confirmAction.user.id, 
          role: newRole 
        });
      } else if (confirmAction.type === 'approve_developer') {
        const { adminApproveDeveloper } = await import('@/lib/api');
        await adminApproveDeveloper(confirmAction.user.id);
      } else if (confirmAction.type === 'suspend_developer') {
        const { adminSuspendDeveloper } = await import('@/lib/api');
        await adminSuspendDeveloper(confirmAction.user.id);
      } else {
        await adminActivateUser(confirmAction.user.id);
      }
      await loadUsers();
      if (selectedUser?.id === confirmAction.user.id) {
        const details = await adminGetUserDetails(confirmAction.user.id);
        setSelectedDetails(details);
      }
      setConfirmAction(null);
    } finally {
      setBusy(false);
    }
  }, [confirmAction, loadUsers, selectedUser?.id]);

`;

content = content.replace("  const columns = useMemo", functionsToAdd + "  const columns = useMemo");

// 3. Update the button to use openUser instead of setSelectedUser directly
content = content.replace(/<Button\s+variant="ghost"\s+size="sm"\s+onClick=\{[^}]+\}\s*>/g, 
  '<Button variant="ghost" size="sm" onClick={() => openUser(row)}>');

fs.writeFileSync(file, content);
