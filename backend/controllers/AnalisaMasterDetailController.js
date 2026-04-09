import { AnalisaMasterDetail } from "../models/AnalisaMasterDetail.js";
import { MasterItem } from "../models/MasterItem.js";
import { AnalisaMaster } from "../models/AnalisaMaster.js";

const round2 = (num) => Number(num.toFixed(2));

export const getAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const analisa = await AnalisaMaster.findByPk(id);

    const details = await AnalisaMasterDetail.findAll({
      where: { analisa_id: id },
      include: [
        {
          model: MasterItem,
          as: "item",
          attributes: ["id", "nama", "tipe", "satuan", "harga_default"]
        }
      ]
    });

    // 🔥 GROUPING
    let tenaga = [];
    let bahan = [];
    let alat = [];

    let totalTenaga = 0;
    let totalBahan = 0;
    let totalAlat = 0;

    details.forEach((d) => {
      if (!d.item) return;

      const harga = round2(Number(d.item.harga_default) || 0);
      const koef = Number(d.koefisien) || 0;

      // 🔥 ROUND DI SINI
      const jumlah = round2(koef * harga);

      const item = {
        id: d.id,
        item_id: d.item.id,
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,
        koefisien: koef,
        harga,
        jumlah
      };

      if (d.item.tipe === "TENAGA") {
        tenaga.push(item);
        totalTenaga = round2(totalTenaga + jumlah);
      } else if (d.item.tipe === "BAHAN") {
        bahan.push(item);
        totalBahan = round2(totalBahan + jumlah);
      } else {
        alat.push(item);
        totalAlat = round2(totalAlat + jumlah);
      }
    });

    // 🔥 TOTAL (WAJIB ROUND)
    const total = round2(totalTenaga + totalBahan + totalAlat);

    // 🔥 OVERHEAD (WAJIB ROUND)
    const persen = Number(analisa.overhead_persen) || 0;
    const overhead = round2((persen / 100) * total);

    // 🔥 GRAND TOTAL (WAJIB ROUND)
    const grandTotal = round2(total + overhead);

    res.json({
      tenaga,
      bahan,
      alat,
      totalTenaga,
      totalBahan,
      totalAlat,
      total,
      overhead,
      grandTotal
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnalisaDetail = async (req, res) => {
  try {
    const { analisa_id, item_id, koefisien } = req.body;

    const data = await AnalisaMasterDetail.create({
      analisa_id,
      item_id,
      koefisien
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAnalisaDetail = async (req, res) => {
  try {
    const data = await AnalisaMasterDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update(req.body);

    res.json({ message: "Berhasil update" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAnalisaDetail = async (req, res) => {
  try {
    const data = await AnalisaMasterDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Berhasil hapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};