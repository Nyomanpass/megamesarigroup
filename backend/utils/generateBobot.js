export const generateBobot = (items) => {
  let totalProject = 0;

  // 1. Hitung total harga (jumlah) untuk setiap item dan akumulasikan total proyek
  const calculated = items.map((item) => {
    const volume = Number(item.volume || 0);
    const harga = Number(item.harga_satuan || 0);
    const jumlah = volume * harga;

    totalProject += jumlah;

    // Jika item adalah objek Sequelize, pastikan dikonversi ke JSON biasa dulu
    const itemData = typeof item.toJSON === "function" ? item.toJSON() : item;

    return {
      ...itemData,
      jumlah
    };
  });

  // 2. Hitung persentase bobot untuk setiap item berdasarkan total proyek
  return calculated.map((item) => {
    const bobot = totalProject > 0 ? (item.jumlah / totalProject) * 100 : 0;

    return {
      ...item,
      bobot: Number(bobot.toFixed(6))
    };
  });
};