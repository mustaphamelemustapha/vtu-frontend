'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, X, Search, Plus } from 'lucide-react';
import { 
  adminGetBroadcasts, 
  adminGetReports, 
  adminUpdateReport, 
  adminCreateBroadcast, 
  adminUpdateBroadcast 
} from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { startCase } from '@/lib/admin-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PremiumDataTable } from '@/components/admin/premium-data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = ['', 'open', 'resolved', 'rejected'];

export default function AdminSupportPage() {
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');

  // Create Announcement Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newLevel, setNewLevel] = useState('info');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeRequestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const requestId = Date.now();
    activeRequestRef.current = requestId;
    setLoading(true);
    try {
      const [reportsRes, broadcastsRes] = await Promise.allSettled([
        adminGetReports({ q: debouncedQuery || undefined, status: status || undefined, page, page_size: pageSize }),
        adminGetBroadcasts(),
      ]);

      if (activeRequestRef.current !== requestId) return;

      if (reportsRes.status === 'fulfilled') {
        const data = reportsRes.value;
        setReports(Array.isArray(data?.items) ? data.items : []);
        setTotalReports(Number(data?.total || 0));
      }
      if (broadcastsRes.status === 'fulfilled') {
        setBroadcasts(Array.isArray(broadcastsRes.value) ? broadcastsRes.value : []);
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, status, page]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const markStatus = useCallback(async (report, nextStatus) => {
    setBusyId(report.id);
    try {
      await adminUpdateReport(report.id, { status: nextStatus });
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert('Title and Message are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: newTitle.trim(),
        message: newMessage.trim(),
        level: newLevel,
        is_active: newIsActive,
      };
      if (newStartsAt) {
        payload.starts_at = new Date(newStartsAt).toISOString();
      }
      if (newEndsAt) {
        payload.ends_at = new Date(newEndsAt).toISOString();
      }
      await adminCreateBroadcast(payload);
      
      // Reset form
      setNewTitle('');
      setNewMessage('');
      setNewLevel('info');
      setNewIsActive(true);
      setNewStartsAt('');
      setNewEndsAt('');
      setShowCreateModal(false);
      await load();
    } catch (err) {
      alert(err.message || 'Failed to create announcement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBroadcastStatus = async (item) => {
    setBusyId(item.id);
    try {
      await adminUpdateBroadcast(item.id, { is_active: !item.is_active });
      await load();
    } catch (err) {
      alert(err.message || 'Failed to update broadcast status');
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(() => [
    { key: 'user_email', label: 'User', sortable: false, render: (row) => <span className="font-medium">{row.user_email}</span> },
    { key: 'transaction_reference', label: 'Subject', sortable: false, render: (row) => <span className="font-mono text-muted-foreground text-xs">{row.transaction_reference || `Issue #${row.id}`}</span> },
    { key: 'reason', label: 'Message', sortable: false, render: (row) => <span className="line-clamp-2 text-sm">{row.reason || 'No message'}</span> },
    { key: 'status', label: 'Status', sortable: false, render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'Created', sortable: false, render: (row) => <span className="text-muted-foreground">{formatDateTime(row.created_at)}</span> },
    {
      key: 'actions',
      label: 'Action',
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" className="h-8 rounded-xl" disabled={busyId === row.id} onClick={() => markStatus(row, 'open')}>Open</Button>
          <Button variant="secondary" size="sm" className="h-8 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20" disabled={busyId === row.id} onClick={() => markStatus(row, 'resolved')}>Resolve</Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-xl text-destructive hover:bg-destructive/10" disabled={busyId === row.id} onClick={() => markStatus(row, 'rejected')}>Reject</Button>
        </div>
      ),
    },
  ], [busyId, markStatus]);

  const FilterControls = (
    <div className="flex items-center gap-3">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search support issues..."
          className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-1 focus:ring-brand/50"
        />
      </div>
      <select
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
      >
        {STATUS_OPTIONS.map((value) => (
          <option key={value || 'all'} value={value}>{value ? startCase(value) : 'All Statuses'}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 relative">
      <AdminPageHeader
        eyebrow="Help Desk"
        title="Support Inbox & Broadcasts"
        description="Manage user issues and platform-wide broadcast announcements."
        actions={(
          <Button variant="outline" className="rounded-xl border-border bg-card/50 backdrop-blur-xl hover:bg-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh Data
          </Button>
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PremiumDataTable 
          data={reports} 
          columns={columns} 
          emptyMessage={loading ? 'Loading support cases...' : 'No support issues found.'}
          headerActions={FilterControls}
          hideSearch={true}
          serverPagination={true}
          totalItems={totalReports}
          currentPage={page}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          isLoading={loading}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-secondary/20 pb-5 pt-6 px-6">
            <div>
              <CardTitle className="text-xl">Broadcast Announcements</CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">Messages sent to all users across the platform.</CardDescription>
            </div>
            <Button className="rounded-xl" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {broadcasts.length === 0 && !loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center rounded-2xl border border-dashed border-border">No broadcast messages created yet.</div>
            ) : broadcasts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/50 bg-background/50 p-5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-base font-semibold text-foreground tracking-tight">{item.title || 'Broadcast'}</div>
                    <Badge variant="outline" className={`
                      rounded-full px-2.5 py-0.5 text-xs font-semibold
                      ${item.level === 'critical' ? 'border-red-500/30 bg-red-500/10 text-red-600' : 
                        item.level === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-600' : 
                        item.level === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 
                        'border-blue-500/30 bg-blue-500/10 text-blue-600'}
                    `}>
                      {item.level?.toUpperCase() || 'INFO'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
                    <Button 
                      variant={item.is_active ? 'secondary' : 'default'}
                      size="sm" 
                      className="rounded-xl h-8"
                      disabled={busyId === item.id}
                      onClick={() => handleToggleBroadcastStatus(item)}
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed p-3 bg-secondary/30 rounded-xl border border-border/50 whitespace-pre-wrap">
                  {item.message || ''}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium pt-1">
                  <div className="flex items-center gap-1.5"><span className="opacity-70">Created:</span> {formatDateTime(item.created_at)}</div>
                  {item.created_by_email && <div className="flex items-center gap-1.5"><span className="opacity-70">By:</span> {item.created_by_email}</div>}
                  {item.starts_at && <div className="flex items-center gap-1.5 text-brand"><span className="opacity-70 text-muted-foreground">Starts:</span> {formatDateTime(item.starts_at)}</div>}
                  {item.ends_at && <div className="flex items-center gap-1.5 text-orange-500"><span className="opacity-70 text-muted-foreground">Ends:</span> {formatDateTime(item.ends_at)}</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg"
            >
              <Card className="shadow-2xl rounded-3xl border-border/50">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-5 pt-6 px-6 bg-secondary/10 rounded-t-3xl">
                  <div>
                    <CardTitle className="text-xl">New Broadcast</CardTitle>
                    <CardDescription className="mt-1">Send platform-wide alerts to users.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary" onClick={() => setShowCreateModal(false)} disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <form onSubmit={handleCreateBroadcast}>
                  <CardContent className="p-6 space-y-5">
                    <div className="space-y-2.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                      <Input
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="E.g., System Maintenance"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        disabled={isSaving}
                        className="h-11 rounded-xl bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                      <textarea
                        required
                        minLength={6}
                        maxLength={2000}
                        placeholder="Enter the broadcast message detail..."
                        className="w-full min-h-[120px] rounded-xl border border-input bg-secondary/30 px-4 py-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50 resize-y"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Severity Level</label>
                        <select
                          value={newLevel}
                          onChange={(e) => setNewLevel(e.target.value)}
                          className="w-full h-11 rounded-xl border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
                          disabled={isSaving}
                        >
                          <option value="info">Info (Blue)</option>
                          <option value="success">Success (Green)</option>
                          <option value="warning">Warning (Amber)</option>
                          <option value="critical">Critical (Red)</option>
                        </select>
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Initial Status</label>
                        <select
                          value={newIsActive ? 'active' : 'inactive'}
                          onChange={(e) => setNewIsActive(e.target.value === 'active')}
                          className="w-full h-11 rounded-xl border border-input bg-secondary/30 px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
                          disabled={isSaving}
                        >
                          <option value="active">Active (Live)</option>
                          <option value="inactive">Inactive (Draft)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starts At (Optional)</label>
                        <Input
                          type="datetime-local"
                          value={newStartsAt}
                          onChange={(e) => setNewStartsAt(e.target.value)}
                          disabled={isSaving}
                          className="h-11 rounded-xl bg-secondary/30"
                        />
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ends At (Optional)</label>
                        <Input
                          type="datetime-local"
                          value={newEndsAt}
                          onChange={(e) => setNewEndsAt(e.target.value)}
                          disabled={isSaving}
                          className="h-11 rounded-xl bg-secondary/30"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <div className="flex justify-end gap-3 p-6 border-t border-border/50 bg-secondary/10 rounded-b-3xl">
                    <Button type="button" variant="ghost" className="rounded-xl h-11 px-6" onClick={() => setShowCreateModal(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" className="rounded-xl h-11 px-6" disabled={isSaving}>
                      {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isSaving ? 'Creating...' : 'Create Announcement'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
