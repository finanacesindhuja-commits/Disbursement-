import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  LogOut, 
  Clock, 
  CheckCircle2, 
  Search, 
  Bell,
  Menu,
  X,
  History as HistoryIcon,
  CreditCard,
  User as UserIcon,
  MoreVertical,
  Banknote,
  Calendar,
  Layers,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Building2,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null); // Drill-down state
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'https://disbursement-4z0v.onrender.com';

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role?.toLowerCase() !== 'disbursement officer') {
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setUser(parsedUser);
      }
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'queue' ? 'queue' : 'history';
      const res = await fetch(`${apiUrl}/api/${endpoint}?search=${encodeURIComponent(searchQuery)}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  // Reset drill-down when tab changes
  useEffect(() => {
    setSelectedCenter(null);
  }, [activeTab]);

  // Handle back button
  const handleBackToCenters = () => {
    setSelectedCenter(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openConfirmModal = (loan) => {
    setSelectedLoan(loan);
    setShowConfirmModal(true);
  };

  const handleCredit = async () => {
    if (!selectedLoan) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`${apiUrl}/api/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          loanId: selectedLoan.id, 
          staffId: user.staffId,
          amountSanctioned: selectedLoan.amount_sanctioned
        })
      });
      
      if (res.ok) {
        setShowConfirmModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to mark as credited.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
      setSelectedLoan(null);
    }
  };

  // Group data by center for the overview
  const groupedCenters = data.reduce((acc, item) => {
    const centerId = item.center_id;
    if (!acc[centerId]) {
      acc[centerId] = {
        center_id: centerId,
        center_name: item.center_name,
        count: 0,
        total_amount: 0,
        members: []
      };
    }
    acc[centerId].count += 1;
    acc[centerId].total_amount += (item.amount_sanctioned || 0);
    acc[centerId].members.push(item);
    return acc;
  }, {});

  const centers = Object.values(groupedCenters);
  const filteredMembers = selectedCenter 
    ? data.filter(item => item.center_id === selectedCenter)
    : [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-300 flex overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} h-full bg-slate-900 border-r border-white/5 flex flex-col`}>
        <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && <span className="text-xl font-bold text-white tracking-tight">Disbursed</span>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-hidden">
          <SidebarItem 
            icon={Layers} 
            label="Dashboard" 
            active={true} 
            collapsed={!isSidebarOpen} 
          />
          <SidebarItem 
            icon={CheckCircle2} 
            label="Verifications" 
            collapsed={!isSidebarOpen} 
          />
          <SidebarItem 
            icon={HistoryIcon} 
            label="Log History" 
            collapsed={!isSidebarOpen} 
          />
        </nav>

        <div className="p-4 mt-auto overflow-hidden">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-semibold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden h-screen bg-slate-950/20">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-white font-bold text-lg">Officer Terminal</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Secure Environment</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                <UserIcon size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs text-white font-bold leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{user.staffId}</p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0a0f1d]"></span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">System Workflow</h2>
              <p className="text-slate-500 mt-1">Manage sanctioned loans and verify financial credits in real-time.</p>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900/60 p-1 rounded-xl flex border border-white/5">
              <button 
                onClick={() => setActiveTab('queue')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Clock size={16} /> Pending Queue
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <HistoryIcon size={16} /> Transaction Log
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total in Queue" value={activeTab === 'queue' ? data.length : '...'} icon={Layers} color="text-blue-400" />
            <StatCard label="Direct Credits" value={activeTab === 'history' ? data.length : '...'} icon={Banknote} color="text-emerald-400" />
            <StatCard label="Active Centers" value={loading ? '...' : [...new Set(data.map(i => i.center_id))].length} icon={Building2} color="text-amber-400" />
            <StatCard label="System Status" value="ACTIVE" icon={ShieldCheck} color="text-emerald-400" isStatus={true} />
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by Member Name, Center, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-600 backdrop-blur-sm shadow-xl"
            />
          </div>

          {/* Table Content */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <LoadingCard key={i} />)}
              </div>
            ) : selectedCenter === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {centers.length === 0 ? (
                  <div className="col-span-full py-20 bg-slate-900/40 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-slate-500">
                    <Building2 size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-bold">No Centers Found</p>
                    <p className="text-sm">Try searching for a different name or ID</p>
                  </div>
                ) : (
                  centers.map((center) => (
                    <CenterCard 
                      key={center.center_id} 
                      center={center} 
                      onClick={() => setSelectedCenter(center.center_id)} 
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={handleBackToCenters}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:-translate-x-1 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 group-hover:border-blue-500/50">
                      <ArrowLeft size={16} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">Back to Centers</span>
                  </button>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-blue-600/10 rounded-xl border border-blue-500/20">
                    <Building2 size={16} className="text-blue-400" />
                    <span className="text-white font-bold">{groupedCenters[selectedCenter]?.center_name}</span>
                    <span className="text-slate-600 font-mono text-xs">#{selectedCenter}</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-800/30 border-b border-white/5 font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                          <th className="px-6 py-5">Member Information</th>
                          <th className="px-6 py-5">Sanctioned Amount</th>
                          <th className="px-6 py-5">Current Status</th>
                          <th className="px-6 py-5 text-right">Operation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredMembers.length === 0 ? (
                          <EmptyRow message="No members found in this center." />
                        ) : (
                          filteredMembers.map((item) => (
                            <tr key={item.id} className="group hover:bg-white/5 transition-all">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  {item.passbook_image_url ? (
                                    <img 
                                      src={item.passbook_image_url} 
                                      alt="Passbook" 
                                      className="w-12 h-12 rounded-lg object-cover cursor-zoom-in border border-white/10 hover:border-blue-500/50 transition-all shadow-lg"
                                      onClick={() => setLightboxImage(item.passbook_image_url)}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-600 border border-dashed border-slate-700">
                                      <CreditCard size={20} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white font-black text-base uppercase tracking-tight leading-none mb-1">{item.member_name}</p>
                                    <p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">LN Number: {item.members?.member_no || 'N/A'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5">
                                  <Banknote size={14} className="text-emerald-500" />
                                  <span className="text-white font-black text-lg font-mono">₹{item.amount_sanctioned?.toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold">
                                {activeTab === 'queue' ? (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm animate-pulse-subtle">
                                    SANCTIONED
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                      CREDITED
                                    </span>
                                    <p className="text-[10px] text-slate-500 font-normal ml-1">
                                      {new Date(item.credited_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {activeTab === 'queue' ? (
                                  <button 
                                    onClick={() => openConfirmModal(item)}
                                    className="btn-primary px-4 py-2 text-xs flex items-center gap-2 group-hover:px-6 transition-all"
                                  >
                                    Confirm Credit <ChevronRight size={14} />
                                  </button>
                                ) : (
                                  <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
                                    <MoreVertical size={18} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isProcessing && setShowConfirmModal(false)}
          ></div>
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 text-amber-500 border border-amber-500/20">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Confirm Financial Credit</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                You are about to authorize a credit of <span className="text-white font-bold">₹{selectedLoan?.amount_sanctioned?.toLocaleString()}</span> for <span className="text-white font-bold">{selectedLoan?.member_name}</span>.
              </p>

              {/* Passbook Preview in Modal */}
              <div className="w-full mb-6 relative group">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2 text-left ml-1">Member Passbook Verification</p>
                {selectedLoan?.passbook_image_url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-slate-950">
                    <img 
                      src={selectedLoan.passbook_image_url} 
                      alt="Full Passbook" 
                      className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500"
                      onClick={() => setLightboxImage(selectedLoan.passbook_image_url)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-slate-300 font-bold bg-black/40 backdrop-blur-md px-2 py-1 rounded-md">
                      <CreditCard size={12} className="text-blue-400" /> Click to Zoom Bank Details
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-2xl bg-slate-800/50 border border-dashed border-slate-700 flex flex-col items-center justify-center gap-2">
                    <AlertTriangle size={32} className="text-slate-600" />
                    <p className="text-xs text-slate-500 font-bold">PASSBOOK IMAGE MISSING</p>
                  </div>
                )}
              </div>

              <div className="w-full space-y-3">
                <button 
                  disabled={isProcessing}
                  onClick={handleCredit}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : "Authorize & Mark CredITED"}
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-4 text-sm font-semibold text-slate-500 hover:text-white transition-colors"
                >
                  Cancel Operation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full View" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

function CenterCard({ center, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="glass-card p-6 rounded-3xl border border-white/5 group hover:border-blue-500/50 transition-all text-left flex flex-col h-full relative overflow-hidden"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xl">
          <Building2 size={24} />
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Center ID</p>
          <p className="text-xs font-mono text-white bg-white/5 px-2 py-1 rounded-md border border-white/5">#{center.center_id}</p>
        </div>
      </div>

      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">{center.center_name}</h3>
      
      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase leading-none">Members</p>
            <p className="text-sm font-black text-white">{center.count}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-extrabold uppercase leading-none mb-1">Total Limit</p>
          <p className="text-emerald-400 font-black text-lg font-mono">₹{center.total_amount?.toLocaleString()}</p>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
        <ChevronRight size={20} />
      </div>
    </button>
  );
}

function LoadingCard() {
  return (
    <div className="glass-card p-6 rounded-3xl border border-white/5 animate-pulse overflow-hidden bg-slate-900/40">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5"></div>
        <div className="w-16 h-4 bg-white/5 rounded-full"></div>
      </div>
      <div className="h-6 bg-white/5 rounded-full w-3/4 mb-8"></div>
      <div className="pt-6 border-t border-white/5 flex justify-between">
        <div className="w-20 h-8 bg-white/5 rounded-lg"></div>
        <div className="w-24 h-8 bg-white/5 rounded-lg"></div>
      </div>
    </div>
  );
}

const SidebarItem = ({ icon: Icon, label, active = false, collapsed = false }) => (
  <button className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600/10 text-white shadow-sm ring-1 ring-blue-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'} whitespace-nowrap`}>
    <Icon size={20} className="shrink-0" />
    {!collapsed && <span className="font-semibold">{label}</span>}
    {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>}
  </button>
);

const StatCard = ({ label, value, icon: Icon, color, isStatus = false }) => (
  <div className="glass-card p-6 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-slate-800/50 ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <div className="text-right">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none">{label}</p>
        <p className={`text-2xl font-black mt-2 tracking-tighter ${color} flex items-center justify-end gap-2`}>
          {isStatus && <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>}
          {value}
        </p>
      </div>
    </div>
  </div>
);

const LoadingRows = () => (
  <>
    {[1, 2, 3].map((i) => (
      <tr key={i} className="animate-pulse">
        <td colSpan="5" className="px-6 py-6 font-mono text-center">
          <div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto"></div>
        </td>
      </tr>
    ))}
  </>
);

const EmptyRow = ({ message }) => (
  <tr>
    <td colSpan="5" className="px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-3 grayscale opacity-30">
        <Layers size={48} />
        <p className="text-slate-500 text-sm font-medium italic">{message}</p>
      </div>
    </td>
  </tr>
);

const LayoutDashboardIcon = ({ size }) => <LayoutDashboard size={size} />;

export default Dashboard;
