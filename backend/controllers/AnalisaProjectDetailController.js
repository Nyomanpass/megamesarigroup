import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { generateBobotInternal } from "./BoqController.js";
import { Boq } from "../models/BoqModel.js";

const round2 = (num) => Number(num.toFixed(2));

const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(angka);
};

export const getProjectAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 ambil analisa + project_id
    const analisa = await ProjectAnalisa.findByPk(id);

    if (!analisa) {
      return res.status(404).json({ message: "Analisa tidak ditemukan" });
    }

    // 🔥 ambil detail + join item project
    const details = await ProjectAnalisaDetail.findAll({
      where: { project_analisa_id: id },
      include: [
        {
          model: ProjectItem,
          as: "item",
          attributes: ["id", "nama", "tipe", "satuan", "harga", "project_id"]
        },
        {
        model: ProjectAnalisa,
          as: "analisa", // 🔥 penting
          attributes: ["id", "nama"]
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
    if (d.item.project_id !== analisa.project_id) return;

    const harga = round2(Number(d.item.harga) || 0);
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

    // 🔥 TOTAL
    const total = round2(totalTenaga + totalBahan + totalAlat);

    const persen = Number(analisa.overhead_persen) || 0;
    const overhead = round2((persen / 100) * total);
    const grandTotal = Math.floor(total + overhead);

    // 🔥 RESPONSE FINAL (TAMBAH INFO PROJECT)
    res.json({
      project_id: analisa.project_id, // 🔥 tambahan penting
      analisa_id: analisa.id,

      tenaga,
      bahan,
      alat,

      totalTenaga,
      totalBahan,
      totalAlat,

      total: formatRupiah(total),
      overhead: formatRupiah(overhead),
      grandTotal: grandTotal,
      nama: analisa.nama,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createProjectAnalisaDetail = async (req, res) => {
  try {
    const { project_analisa_id, item_id, koefisien } = req.body;

    const data = await ProjectAnalisaDetail.create({
      project_analisa_id,
      item_id,
      koefisien
    });

    // 🔥 CARI BOQ YANG PAKAI ANALISA INI
    const boqList = await Boq.findAll({
      where: { analisa_id: project_analisa_id }
    });

    const projectIds = [...new Set(boqList.map(b => b.project_id))];

    // 🔥 UPDATE BOBOT
    for (let pid of projectIds) {
      await generateBobotInternal(pid);
    }

    res.status(201).json({
      message: "Berhasil tambah + bobot otomatis",
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update(req.body);

    // 🔥 AMBIL ANALISA
    const analisa = await ProjectAnalisa.findByPk(data.project_analisa_id);

    if (analisa) {
      // 🔥 CARI SEMUA BOQ YANG PAKAI ANALISA INI
      const boqList = await Boq.findAll({
        where: { analisa_id: analisa.id }
      });

      // 🔥 AMBIL PROJECT YANG TERPAKAI
      const projectIds = [...new Set(boqList.map(b => b.project_id))];

      // 🔥 UPDATE BOBOT PER PROJECT
      for (let pid of projectIds) {
        await generateBobotInternal(pid);
      }
    }

    res.json({ message: "Berhasil update + bobot otomatis", data });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const analisa_id = data.project_analisa_id;

    await data.destroy();

    // 🔥 CARI BOQ YANG PAKAI ANALISA INI
    const boqList = await Boq.findAll({
      where: { analisa_id }
    });

    const projectIds = [...new Set(boqList.map(b => b.project_id))];

    // 🔥 UPDATE BOBOT
    for (let pid of projectIds) {
      await generateBobotInternal(pid);
    }

    res.json({
      message: "Berhasil hapus + bobot otomatis"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};