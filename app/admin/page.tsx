"use client";
import { useState, useEffect } from "react";
import { supabase } from "../supabase";

type Reservation = {
  Id: number;
  created_at: string;
  nama_tamu: string;
  no_whatsapp: string;
  outlet: string;
  tanggal: string;
  jam: string;
  jumlah_tamu: number;
  catatan: string | null;
  status: string;
  meja_id: number | null;
  menu_paket_id: number | null;
  dp_amount: number | null;
};

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filterOutlet, setFilterOutlet] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    let query = supabase.from("Reservation").select("*").order("created_at", { ascending: false });
    if (filterOutlet) query = query.eq("outlet", filterOutlet);
    if (filterStatus) query = query.eq("status", filterStatus);
    if (filterDate) query = query.eq("tanggal", filterDate);
    const { data } = await query;
    setReservations(data || []);
    setLoading(false);
  }

  useEffect(() => { void fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
}, [filterOutlet, filterStatus, filterDate]);

  async function updateStatus(id: number, newStatus: string) {
    await supabase.from("Reservation").update({ status: newStatus }).eq("Id", id);
    fetchData();
  }

  function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === "Pending").length,
    confirmed: reservations.filter((r) => r.status === "Confirmed").length,
    completed: reservations.filter((r) => r.status === "Completed").length,
    cancelled: reservations.filter((r) => r.status === "Cancelled").length,
  };

  const statusColors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Confirmed: "bg-blue-100 text-blue-800 border-blue-300",
    Completed: "bg-green-100 text-green-800 border-green-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C8973E] to-[#A67B2E] px-4 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white font-serif">Dashboard Admin</h1>
            <p className="text-white/70 text-sm">Yassalam Arabian Resto & Catering</p>
          </div>
          <a href="/" className="text-white/80 text-sm hover:text-white transition-all">← Ke Website</a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "bg-white border-[#C8973E]/20 text-[#5C3D1A]" },
            { label: "Pending", value: stats.pending, color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
            { label: "Confirmed", value: stats.confirmed, color: "bg-blue-50 border-blue-200 text-blue-800" },
            { label: "Completed", value: stats.completed, color: "bg-green-50 border-green-200 text-green-800" },
            { label: "Cancelled", value: stats.cancelled, color: "bg-red-50 border-red-200 text-red-800" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} border rounded-xl p-4 text-center`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs mt-1 opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#E8DCC8] rounded-xl p-4 mb-6 flex flex-wrap gap-3">
          <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8DCC8] bg-[#FEFCF8] text-sm text-[#5C3D1A] outline-none focus:border-[#C8973E]">
            <option value="">Semua Outlet</option>
            <option value="solo">Solo</option>
            <option value="jogja">Yogyakarta</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8DCC8] bg-[#FEFCF8] text-sm text-[#5C3D1A] outline-none focus:border-[#C8973E]">
            <option value="">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8DCC8] bg-[#FEFCF8] text-sm text-[#5C3D1A] outline-none focus:border-[#C8973E]" />
          {(filterOutlet || filterStatus || filterDate) && (
            <button onClick={() => { setFilterOutlet(""); setFilterStatus(""); setFilterDate(""); }}
              className="px-3 py-2 text-sm text-[#C8973E] hover:underline">
              Reset Filter
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center text-[#8B7355] py-10">Memuat data...</p>
        ) : reservations.length === 0 ? (
          <p className="text-center text-[#8B7355] py-10">Tidak ada reservasi ditemukan</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.Id} className="bg-white border border-[#E8DCC8] rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Info utama */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#5C3D1A] text-lg">{r.nama_tamu}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8B7355]">
                      <span>📍 <span className="capitalize">{r.outlet}</span></span>
                      <span>📅 {r.tanggal}</span>
                      <span>🕐 {r.jam}</span>
                      <span>👥 {r.jumlah_tamu} orang</span>
                      {r.meja_id && <span>🪑 Meja #{r.meja_id}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#8B7355]">
                      <span>📱 {r.no_whatsapp}</span>
                      {r.dp_amount ? <span>💰 DP: {formatRupiah(r.dp_amount)}</span> : null}
                    </div>
                    {r.catatan && <p className="text-sm text-[#B8A88A] italic">📝 {r.catatan}</p>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {r.status === "Pending" && (
                      <>
                        <button onClick={() => updateStatus(r.Id, "Confirmed")}
                          className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all">
                          ✓ Konfirmasi
                        </button>
                        <button onClick={() => updateStatus(r.Id, "Cancelled")}
                          className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold transition-all">
                          ✕ Tolak
                        </button>
                      </>
                    )}
                    {r.status === "Confirmed" && (
                      <button onClick={() => updateStatus(r.Id, "Completed")}
                        className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-all">
                        ✓ Selesai
                      </button>
                    )}
                    {r.status === "Cancelled" && (
                      <button onClick={() => updateStatus(r.Id, "Pending")}
                        className="px-4 py-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-sm font-semibold transition-all">
                        ↩ Kembalikan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}