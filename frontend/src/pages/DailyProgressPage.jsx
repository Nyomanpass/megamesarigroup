import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function DailyProgressPage() {
  const { id } = useParams();

  const [boqList, setBoqList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);

  const [form, setForm] = useState({
    boq_id: "",
    tanggal: "",
    volume: ""
  });

  // 🔥 FETCH DATA PROGRESS
  const fetchData = async () => {
    try {
      const res = await api.get("/daily-progress");
      const filtered = res.data.filter(
        (item) => item.project_id == id
      );
      setData(filtered);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 FETCH BOQ
  const fetchBoq = async () => {
    try {
      const res = await api.get(`/boq/project/${id}`);
      setBoqList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 FETCH SUMMARY (API BACKEND)
  const fetchSummary = async (boq_id) => {
    try {
      const res = await api.get(`/progress-summary/${boq_id}`);
      setSummary(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBoq();
  }, []);

  // 🔥 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/daily-progress", {
        ...form,
        project_id: id
      });

      setForm({ boq_id: "", tanggal: "", volume: "" });
      fetchData();
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 HITUNG PER BOQ (LOCAL)
  const getBoqSummary = (boq_id) => {
    const boq = boqList.find((b) => b.id == boq_id);

    const total = boq?.volume || 0;

    const sudah = data
      .filter((d) => d.boq_id == boq_id)
      .reduce((sum, d) => sum + Number(d.volume), 0);

    const sisa = total - sudah;

    return {
      total: total || 0,
      sudah: sudah || 0,
      sisa: sisa || 0
    };
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Daily Progress Project #{id}
      </h1>

      {/* 🔥 FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow mb-6 grid gap-3"
      >
        <select
          value={form.boq_id}
          onChange={(e) => {
            const boq_id = e.target.value;

            setForm({ ...form, boq_id });

            if (boq_id) {
              fetchSummary(boq_id); // 🔥 panggil API
            }
          }}
          className="border p-2 rounded"
        >
          <option value="">-- Pilih BOQ --</option>
          {boqList
            ?.filter((boq) => boq.tipe === "item")
            .map((boq) => (
              <option key={boq.id} value={boq.id}>
                {boq.kode} - {boq.uraian}
              </option>
            ))}
        </select>

        <input
          type="date"
          value={form.tanggal}
          onChange={(e) =>
            setForm({ ...form, tanggal: e.target.value })
          }
          className="border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Volume"
          value={form.volume}
          onChange={(e) =>
            setForm({ ...form, volume: e.target.value })
          }
          className="border p-2 rounded"
        />

        <button className="bg-blue-500 text-white p-2 rounded">
          Tambah Progress
        </button>
      </form>

      {/* 🔥 SUMMARY (DARI BACKEND) */}
      {summary && (
        <div className="bg-green-50 border p-4 rounded-lg mb-4">
          <p><b>Total:</b> {summary.total}</p>
          <p><b>Sudah:</b> {summary.sudah}</p>
          <p><b>Sisa:</b> {summary.sisa}</p>
          <p>
            <b>Progress:</b>{" "}
            {summary.total
              ? ((summary.sudah / summary.total) * 100).toFixed(1)
              : 0}%
          </p>
        </div>
      )}

      {/* 🔥 TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Tanggal</th>
              <th className="p-2">Uraian</th>
              <th className="p-2">Volume</th>
              <th className="p-2">Satuan</th>
              <th className="p-2">Progress</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item) => {
              const s = getBoqSummary(item.boq_id);

              const persen = s.total
                ? (s.sudah / s.total) * 100
                : 0;

              return (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.tanggal}</td>

                  <td className="p-2">
                    {item.boq?.uraian || "-"}
                  </td>

                  <td className="p-2">{item.volume}</td>

                  <td className="p-2">
                    {item.boq?.satuan || "-"}
                  </td>

                  <td className="p-2 text-sm">
                    <div>Total: {s.total}</div>
                    <div>Sudah: {s.sudah}</div>
                    <div>Sisa: {s.sisa}</div>
                    <div className="text-green-600 font-semibold">
                      {persen.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}