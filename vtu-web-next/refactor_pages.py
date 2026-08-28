import re

# Edit agents/page.jsx
with open('src/app/(admin)/admin/agents/page.jsx', 'r') as f:
    content = f.read()

content = content.replace("export default function AdminUsersPage", "export default function AdminAgentsPage")
content = content.replace("import {\n  adminActivateUser,\n  adminDeleteUser,\n  adminGetUserDetails,\n  adminGetUsers,\n  adminSuspendUser,\n  adminUpdateUserRole,\n} from '@/lib/api';", "import {\n  adminGetAgents,\n} from '@/lib/api';")

content = re.sub(r'const role = searchParams\.get\(\'role\'\).*?;\n', '', content)
content = re.sub(r'const status = searchParams\.get\(\'status\'\).*?;\n', '', content)

content = re.sub(r'const loadUsers.*?\}\n  \}, \[search, role, status, page\]\);', 
'''const loadUsers = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const response = await adminGetAgents({ 
        q: search || undefined, 
        page, 
        page_size: 50 
      });
      if (activeRequestRef.current !== requestId) return;
      setUsers(Array.isArray(response?.items) ? response.items : []);
      setTotal(response?.total || 0);
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [search, page]);''', content, flags=re.DOTALL)

content = content.replace("title=\"Users management\"", "title=\"Agents management\"")
content = content.replace("Refresh users", "Refresh agents")
content = content.replace("No users found", "No agents found")

columns_replacement = '''const columns = useMemo(() => [
    { key: 'full_name', label: 'Name', render: (row) => row.name },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone', render: (row) => row.phone },
    {
      key: 'wallet_balance',
      label: 'Wallet balance',
      render: (row) => <span className="font-medium">₦{formatMoney(row.wallet_balance || 0)}</span>,
    },
    {
      key: 'cumulative_sales_gb',
      label: 'Sales Vol (GB)',
      render: (row) => <span className="font-semibold text-emerald-600">{Number(row.cumulative_sales_gb || 0).toFixed(2)} GB</span>,
    },
    { key: 'upgraded_at', label: 'Upgraded On', render: (row) => <span className="text-muted-foreground">{formatDateTime(row.upgraded_at)}</span> },
  ], []);'''

content = re.sub(r'const columns = useMemo.*?\]\);\n', columns_replacement + "\n", content, flags=re.DOTALL)

# Delete openUser logic since we don't need it right now for agents
content = re.sub(r'const openUser = useCallback.*?\]\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'const runAction = useCallback.*?\]\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'\{selectedUser && \(.*?</ConfirmDialog>', '', content, flags=re.DOTALL)

with open('src/app/(admin)/admin/agents/page.jsx', 'w') as f:
    f.write(content)

# Edit ambassadors/page.jsx
with open('src/app/(admin)/admin/ambassadors/page.jsx', 'r') as f:
    content2 = f.read()

content2 = content2.replace("export default function AdminUsersPage", "export default function AdminAmbassadorsPage")
content2 = content2.replace("import {\n  adminActivateUser,\n  adminDeleteUser,\n  adminGetUserDetails,\n  adminGetUsers,\n  adminSuspendUser,\n  adminUpdateUserRole,\n} from '@/lib/api';", "import {\n  adminGetAmbassadors,\n  adminPayAmbassadorCommission\n} from '@/lib/api';")

content2 = re.sub(r'const role = searchParams\.get\(\'role\'\).*?;\n', '', content2)
content2 = re.sub(r'const status = searchParams\.get\(\'status\'\).*?;\n', '', content2)

content2 = re.sub(r'const loadUsers.*?\}\n  \}, \[search, role, status, page\]\);', 
'''const loadUsers = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const response = await adminGetAmbassadors({ 
        q: search || undefined, 
        page, 
        page_size: 50 
      });
      if (activeRequestRef.current !== requestId) return;
      setUsers(Array.isArray(response?.items) ? response.items : []);
      setTotal(response?.total || 0);
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [search, page]);''', content2, flags=re.DOTALL)

content2 = content2.replace("title=\"Users management\"", "title=\"Ambassadors management\"")
content2 = content2.replace("Refresh users", "Refresh ambassadors")
content2 = content2.replace("No users found", "No ambassadors found")

columns2 = '''const columns = useMemo(() => [
    { key: 'full_name', label: 'Name', render: (row) => row.name },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone', render: (row) => row.phone },
    {
      key: 'total_vendors',
      label: 'Onboarded Vendors',
      render: (row) => <span className="font-semibold">{row.total_vendors_onboarded}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant="secondary" size="sm" onClick={() => setSelectedUser(row)}>
          <Eye className="h-3.5 w-3.5 mr-1" />
          View Details
        </Button>
      ),
    },
  ], []);'''

content2 = re.sub(r'const columns = useMemo.*?\]\);\n', columns2 + "\n", content2, flags=re.DOTALL)

content2 = re.sub(r'const openUser = useCallback.*?\]\);\n', '', content2, flags=re.DOTALL)

action2 = '''const runAction = useCallback(async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
        await adminPayAmbassadorCommission({
            ambassador_id: selectedUser.id,
            vendor_id: confirmAction.vendor.vendor_id,
            commission_type: confirmAction.type
        });
        await loadUsers();
        // Since loadUsers updates `users`, we need to update selectedUser
        setSelectedUser(null);
        setConfirmAction(null);
    } finally {
        setBusy(false);
    }
  }, [confirmAction, loadUsers, selectedUser]);'''

content2 = re.sub(r'const runAction = useCallback.*?\]\);\n', action2 + "\n", content2, flags=re.DOTALL)

dialog_replacement = '''
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Ambassador Details</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-sm mb-2">Onboarded Vendors</h3>
              <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Vendor Name</th>
                            <th className="px-4 py-3">Initial Dep</th>
                            <th className="px-4 py-3">Total Vol (GB)</th>
                            <th className="px-4 py-3">10% Commission</th>
                            <th className="px-4 py-3">50GB Milestone</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {selectedUser.vendors.map((v) => (
                            <tr key={v.vendor_id} className="bg-card hover:bg-secondary/20">
                                <td className="px-4 py-3">{v.vendor_name}<br/><span className="text-[10px] text-muted-foreground">{v.vendor_email}</span></td>
                                <td className="px-4 py-3">₦{formatMoney(v.initial_deposit_amount || 0)}</td>
                                <td className="px-4 py-3">{Number(v.accumulated_gb || 0).toFixed(2)} GB</td>
                                <td className="px-4 py-3">
                                    {v.is_ten_percent_paid ? <StatusBadge status="success" /> : (
                                        <Button size="sm" onClick={() => setConfirmAction({ type: '10_PERCENT', vendor: v })}>Pay 10%</Button>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {v.is_milestone_bonus_paid ? <StatusBadge status="success" /> : (
                                        v.is_50gb_milestone_reached ? (
                                            <Button size="sm" onClick={() => setConfirmAction({ type: '50GB_MILESTONE', vendor: v })}>Pay Bonus</Button>
                                        ) : <span className="text-xs text-muted-foreground">Not reached</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
                  {selectedUser.vendors.length === 0 && <div className="p-4 text-center text-muted-foreground">No vendors onboarded yet</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title="Pay Commission"
        description="Are you sure you want to pay this commission to the ambassador?"
        confirmLabel="Pay Commission"
        busy={busy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runAction}
      />
'''

content2 = re.sub(r'\{selectedUser && \(.*?</ConfirmDialog>', dialog_replacement, content2, flags=re.DOTALL)

with open('src/app/(admin)/admin/ambassadors/page.jsx', 'w') as f:
    f.write(content2)
