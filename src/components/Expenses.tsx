import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Calendar,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Wallet,
  Receipt,
  CreditCard,
  Download,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { canUserEditRecord } from '@/utils/rbac';

import { MOCK_USERS } from '@/mockData';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>(() => {
    return storage.get<any[]>(STORAGE_KEYS.EXPENSES, []) || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [specificDateSearch, setSpecificDateSearch] = useState('');
  const [newExpense, setNewExpense] = useState({ 
    expense_date: new Date().toISOString().split('T')[0], 
    category: 'Utilities', 
    description: '', 
    amount: 0,
    payment_method: 'Cash',
    status: 'Paid'
  });
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [period, setPeriod] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [expensePage, setExpensePage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setExpensePage(1);
  }, [searchQuery, period, dateRange, paymentModeFilter, categoryFilter, specificDateSearch]);

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const [users, setUsers] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.USERS, MOCK_USERS);
  });

  useEffect(() => {
    supabaseService.getStaff().then(data => {
      if (data && data.length > 0) {
        setUsers(data);
      }
    });
  }, []);

  const isAddedByAdmin = (record: any) => {
    if (!record) return false;
    const creatorId = record.created_by || record.issued_by || record.createdBy;
    if (!creatorId) {
      // Legacy seeded expense with no creator are treated as admin-seeded
      return true;
    }
    if (creatorId === 'u2' || creatorId === 'u-admin' || creatorId === 'u-admingh') return true;
    const creatorUser = users?.find((u: any) => u.id === creatorId || u.email === creatorId);
    if (creatorUser && (creatorUser.role === 'SUPER_ADMIN' || creatorUser.role === 'ADMIN')) return true;
    return false;
  };

  const canModify = (record: any) => {
    return canUserEditRecord(record, currentUser);
  };

  const fetchExpenses = async () => {
    try {
      const data = await supabaseService.getExpenses();
      if (data && Array.isArray(data) && data.length > 0) {
        setExpenses(data);
      }
    } catch (e) {
      console.warn('Silent fallback for fetchExpenses:', e);
    }
  };

  useDataSync(fetchExpenses);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    const expenseData = {
      ...newExpense,
      created_by: currentUser?.id || 'u-accounts'
    };

    const result = await supabaseService.createExpense(expenseData);
    if (result) {
      toast.success('Expense recorded');
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'insert' } }));
      setNewExpense({ 
        expense_date: new Date().toISOString().split('T')[0], 
        category: 'Utilities', 
        description: '', 
        amount: 0,
        payment_method: 'Cash',
        status: 'Paid'
      });
      setIsAddExpenseOpen(false);
    } else {
      toast.error('Failed to record expense');
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.description || !editingExpense.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!canModify(editingExpense)) {
      toast.error('This expense record was created by administration and cannot be modified by non-admin roles.');
      return;
    }

    const { id, created_at, ...updates } = editingExpense;
    const result = await supabaseService.updateExpense(id, {
      expense_date: updates.expense_date,
      category: updates.category,
      description: updates.description,
      amount: Number(updates.amount),
      payment_method: updates.payment_method || updates.paymentMethod || 'Cash',
      status: updates.status,
      created_by: editingExpense.created_by || editingExpense.issued_by
    });

    if (result) {
      toast.success('Expense record updated');
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'update' } }));
      setEditingExpense(null);
      setIsEditExpenseOpen(false);
    } else {
      toast.error('Failed to update expense record');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const roleUpper = (currentUser?.role || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of expense records is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const expenseToDelete = expenses.find(e => e.id === id);
    if (expenseToDelete && !canModify(expenseToDelete)) {
      toast.error('This expense record was created by administration and cannot be deleted by non-admin roles.');
      return;
    }
    if (!window.confirm("Are you sure you want to delete this expense record?")) {
      return;
    }

    const success = await supabaseService.deleteExpense(id);
    if (success) {
      toast.success('Expense record removed');
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'delete' } }));
    } else {
      toast.error('Failed to remove expense record');
    }
  };

  const handleExportExpenses = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Status'];
    const rows = filteredExpenses.map(e => [
      e.expense_date,
      e.category,
      e.description,
      e.amount,
      e.payment_method || e.paymentMethod || 'Cash',
      e.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'hospital_expenses.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Expenses exported as CSV');
  };

  const getLocalDateStrFromVal = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPeriodLabel = () => {
    if (specificDateSearch) return `Date: ${specificDateSearch}`;
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this-week': return 'This Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'this-year': return 'This Year';
      case 'custom': return 'Custom';
      default: return 'All Time';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    // 1. Search Query Filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (e.description?.toLowerCase() || '').includes(q) ||
      (e.category?.toLowerCase() || '').includes(q) ||
      (e.payment_method?.toLowerCase() || e.paymentMethod?.toLowerCase() || '').includes(q);
    if (!matchesSearch) return false;

    // 2. Category Filter
    if (categoryFilter !== 'all' && e.category !== categoryFilter) {
      return false;
    }

    // 3. Payment Mode Filter
    if (paymentModeFilter !== 'all') {
      const mode = (e.payment_method || e.paymentMethod || 'Cash').toLowerCase();
      const targetMode = paymentModeFilter.toLowerCase();
      if (!mode.includes(targetMode) && !targetMode.includes(mode)) {
        return false;
      }
    }

    // 4. Specific Date Search Filter
    const dateVal = e.expense_date || e.created_at;
    if (!dateVal) return false;
    const expDateStr = getLocalDateStrFromVal(dateVal);
    if (!expDateStr) return false;

    if (specificDateSearch) {
      if (expDateStr !== specificDateSearch) return false;
    }

    // 5. Period & Date Range Filter
    const now = new Date();
    const todayStr = getLocalDateStrFromVal(now);
    const [y, m] = expDateStr.split('-').map(Number);

    if (period === 'today') {
      return expDateStr === todayStr;
    }

    if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStrFromVal(yesterday);
      return expDateStr === yesterdayStr;
    }

    if (period === 'this-week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfWeekStr = getLocalDateStrFromVal(startOfWeek);
      return expDateStr >= startOfWeekStr && expDateStr <= todayStr;
    }

    if (period === 'this-month') {
      return m === (now.getMonth() + 1) && y === now.getFullYear();
    }

    if (period === 'last-month') {
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      const lm = lastMonthDate.getMonth() + 1;
      const ly = lastMonthDate.getFullYear();
      return m === lm && y === ly;
    }

    if (period === 'this-year') {
      return y === now.getFullYear();
    }

    if (period === 'custom' && dateRange.start && dateRange.end) {
      const start = getLocalDateStrFromVal(dateRange.start);
      const end = getLocalDateStrFromVal(dateRange.end);
      return expDateStr >= start && expDateStr <= end;
    }

    return true;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilityBills = filteredExpenses
    .filter(e => e.category === 'Utilities')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingVouchers = filteredExpenses.filter(e => e.status === 'Pending').length;

  const cashExpensesTotal = filteredExpenses
    .filter(e => (e.payment_method || e.paymentMethod || 'Cash').toLowerCase().includes('cash'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const digitalExpensesTotal = filteredExpenses
    .filter(e => {
      const m = (e.payment_method || e.paymentMethod || '').toLowerCase();
      return m.includes('upi') || m.includes('card') || m.includes('bank') || m.includes('online');
    })
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #BFF4BE, #F2FCF1, #BFF4BE)', borderColor: '#a3dfa1' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F3B2C]">Expense Management</h1>
          <p className="text-[#1C533C] font-semibold text-sm">Track daily hospital expenses and operational costs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white/80 border-[#0F3B2C]/25 text-[#0F3B2C] hover:bg-white font-bold" onClick={handleExportExpenses}>
            <Download className="w-4 h-4 text-[#0F3B2C]" />
            Export Expenses
          </Button>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A5E63] hover:bg-[#154c50] text-white gap-2 font-bold" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="w-4 h-4" />
                Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>Enter details for a new hospital expense.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Expense Category</Label>
                  <Select 
                    value={newExpense.category}
                    onValueChange={(v) => setNewExpense({...newExpense, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="e.g. Generator Fuel" 
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newExpense.amount || ""}
                      onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select 
                      value={newExpense.payment_method || 'Cash'}
                      onValueChange={(v) => setNewExpense({...newExpense, payment_method: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI / Online">UPI / Online</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select 
                      value={newExpense.status}
                      onValueChange={(v) => setNewExpense({...newExpense, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleAddExpense}>Add Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Expense Record</DialogTitle>
                <DialogDescription>Modify the details of this hospital expense.</DialogDescription>
              </DialogHeader>
              {editingExpense && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Expense Category</Label>
                    <Select 
                      value={editingExpense.category}
                      onValueChange={(v) => setEditingExpense({...editingExpense, category: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      placeholder="e.g. Generator Fuel" 
                      value={editingExpense.description || ""}
                      onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={editingExpense.amount || ""}
                        onChange={(e) => setEditingExpense({...editingExpense, amount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={editingExpense.expense_date || ""}
                        onChange={(e) => setEditingExpense({...editingExpense, expense_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select 
                        value={editingExpense.payment_method || editingExpense.paymentMethod || 'Cash'}
                        onValueChange={(v) => setEditingExpense({...editingExpense, payment_method: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI / Online">UPI / Online</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select 
                        value={editingExpense.status}
                        onValueChange={(v) => setEditingExpense({...editingExpense, status: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingExpense(null);
                  setIsEditExpenseOpen(false);
                }}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleUpdateExpense}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-rose-50/80 to-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Total Expenses ({getPeriodLabel()})</p>
              <h3 className="text-2xl font-black text-rose-600">{formatCurrency(totalFiltered)}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Against active filter ({filteredExpenses.length} records)</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-100/80 text-rose-600 shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50/80 to-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Cash Expenses</p>
              <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(cashExpensesTotal)}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Paid in cash</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100/80 text-emerald-600 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50/80 to-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Online / Card / UPI</p>
              <h3 className="text-2xl font-black text-blue-600">{formatCurrency(digitalExpensesTotal)}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Digital payment modes</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100/80 text-blue-600 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50/80 to-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Pending Vouchers</p>
              <h3 className="text-2xl font-black text-amber-600">{pendingVouchers} <span className="text-xs font-normal text-slate-500">vouchers</span></h3>
              <p className="text-[10px] text-slate-500 font-medium">Unsettled expenses</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-100/80 text-amber-600 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Expense Management Log</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Total Expenses for Selection: <span className="font-bold text-slate-900">{formatCurrency(totalFiltered)}</span> ({filteredExpenses.length} Records)
              </CardDescription>
            </div>
            {(specificDateSearch || paymentModeFilter !== 'all' || categoryFilter !== 'all' || period !== 'all' || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-start sm:self-auto"
                onClick={() => {
                  setSearchQuery('');
                  setPaymentModeFilter('all');
                  setCategoryFilter('all');
                  setSpecificDateSearch('');
                  setPeriod('all');
                  setDateRange({ start: '', end: '' });
                }}
              >
                Reset All Filters
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search description/category..." 
                className="pl-10 bg-slate-50 border-none h-9 w-full text-xs" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Search Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 text-medical-blue shrink-0" />
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Search Date:</span>
              <Input 
                type="date"
                className="h-7 w-32 text-xs border-none bg-transparent focus-visible:ring-0 p-0 text-slate-800 font-medium"
                value={specificDateSearch}
                onChange={(e) => {
                  setSpecificDateSearch(e.target.value);
                  if (e.target.value) setPeriod('all');
                }}
              />
              {specificDateSearch && (
                <button 
                  onClick={() => setSpecificDateSearch('')} 
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                  title="Clear Date"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Payment Mode Filter */}
            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-none rounded-md font-medium text-xs text-slate-700">
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Modes</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI / Online">UPI / Online</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] h-9 bg-slate-50 border-none rounded-md font-medium text-xs text-slate-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={period} onValueChange={(val) => {
              setPeriod(val);
              if (val !== 'all') setSpecificDateSearch('');
            }}>
              <SelectTrigger className="w-[140px] h-9 bg-slate-50 border-none rounded-md font-medium text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-medical-blue shrink-0" />
                  <SelectValue placeholder="Period" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-md text-slate-800">
                <Input 
                  type="date" 
                  className="h-7 w-28 text-xs border-none font-medium bg-transparent focus-visible:ring-0 p-0" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-slate-400 text-xs px-0.5">-</span>
                <Input 
                  type="date" 
                  className="h-7 w-28 text-xs border-none font-medium bg-transparent focus-visible:ring-0 p-0" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Payment Mode</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No matching expense records found for the applied filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
                      const dateA = new Date(a.expense_date || a.created_at || 0).getTime();
                      const dateB = new Date(b.expense_date || b.created_at || 0).getTime();
                      return dateB - dateA;
                    });
                    const paginatedExpenses = sortedExpenses.slice((expensePage - 1) * itemsPerPage, expensePage * itemsPerPage);
                    
                    return paginatedExpenses.map((expense) => {
                      const modeStr = expense.payment_method || expense.paymentMethod || 'Cash';
                      let modeStyle = 'bg-slate-100 text-slate-700';
                      if (modeStr.toLowerCase().includes('cash')) modeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (modeStr.toLowerCase().includes('upi') || modeStr.toLowerCase().includes('online')) modeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                      else if (modeStr.toLowerCase().includes('card')) modeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                      else if (modeStr.toLowerCase().includes('bank')) modeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      else if (modeStr.toLowerCase().includes('cheque')) modeStyle = 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <TableRow key={expense.id} className="border-slate-50">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(expense.expense_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap">{expense.description}</TableCell>
                          <TableCell className="font-bold whitespace-nowrap text-rose-600">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className={`text-[11px] font-semibold ${modeStyle}`}>
                              {modeStr}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className={`border-none ${
                              expense.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {expense.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2 items-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue hover:bg-blue-50" title="Edit Expense" onClick={() => {
                                setEditingExpense({...expense});
                                setIsEditExpenseOpen(true);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {(() => {
                                const r = (currentUser?.role || '').toUpperCase();
                                return !(r === 'RECEPTIONIST' || r === 'RECEPTION' || r === 'FRONT_DESK' || r === 'DOCTOR' || r === 'SURGEON' || r === 'ACCOUNTANT' || r === 'ACCOUNTS');
                              })() && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" title="Delete Expense" onClick={() => handleDeleteExpense(expense.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()
                )}
              </TableBody>
            </Table>
          </div>

          {filteredExpenses.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Showing <strong>{Math.min(filteredExpenses.length, (expensePage - 1) * itemsPerPage + 1)}</strong> to{' '}
                <strong>{Math.min(filteredExpenses.length, expensePage * itemsPerPage)}</strong> of{' '}
                <strong>{filteredExpenses.length}</strong> entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                  onClick={() => setExpensePage(prev => Math.max(prev - 1, 1))}
                  disabled={expensePage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.ceil(filteredExpenses.length / itemsPerPage) }, (_, idx) => idx + 1)
                  .filter(p => p === 1 || p === Math.ceil(filteredExpenses.length / itemsPerPage) || Math.abs(p - expensePage) <= 1)
                  .map((p, i, arr) => {
                    return (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                        <Button
                          variant={p === expensePage ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 w-8 text-xs p-0 ${p === expensePage ? 'bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                          onClick={() => setExpensePage(p)}
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                  onClick={() => setExpensePage(prev => Math.min(prev + 1, Math.ceil(filteredExpenses.length / itemsPerPage)))}
                  disabled={expensePage === Math.ceil(filteredExpenses.length / itemsPerPage)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
