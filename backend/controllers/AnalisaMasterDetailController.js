import { AnalisaMasterDetail } from "../models/AnalisaMasterDetail.js";
import { MasterItem } from "../models/MasterItem.js";
import { AnalisaMaster } from "../models/AnalisaMaster.js";

export const getAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const analisa = await AnalisaMaster.findByPk(id);

    const details = await AnalisaMasterDetail.findAll({
      where: { analisa_id: id },
      include: [
  {
    model: MasterItem,
    as: "item", // 🔥 WAJIB
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
    if (!d.item) return; // 🔥 amankan

    const harga = Number(d.item.harga_default) || 0;
    const jumlah = d.koefisien * harga;

    const item = {
        id: d.id,
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,
        koefisien: d.koefisien,
        harga,
        jumlah
    };

    if (d.item.tipe === "TENAGA") {
        tenaga.push(item);
        totalTenaga += jumlah;
    } else if (d.item.tipe === "BAHAN") {
        bahan.push(item);
        totalBahan += jumlah;
    } else {
        alat.push(item);
        totalAlat += jumlah;
    }
    });

    const total = totalTenaga + totalBahan + totalAlat;
    const overhead = (analisa.overhead_persen / 100) * total;
    const grandTotal = total + overhead;

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