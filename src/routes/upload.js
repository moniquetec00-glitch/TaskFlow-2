const cloudinary = require("cloudinary").v2;
const multer     = require("multer");
const { autenticar } = require("../middleware/auth");
const { db }         = require("../db/database");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function registrar(router) {
    router.post("/api/usuarios/avatar", autenticar, upload.single("avatar"), async (req, res) => {
        try {
            if (!req.file) return res.json({ erro: "Nenhum arquivo enviado." }, 400);

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "taskflow/avatars", public_id: req.usuario.id, overwrite: true, transformation: [{ width: 200, height: 200, crop: "fill" }] },
                    (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });

            await db.atualizarAvatar(req.usuario.id, result.secure_url);
            res.json({ avatar: result.secure_url });
        } catch(e) {
            console.error("Erro no upload:", e.message);
            res.json({ erro: "Erro ao fazer upload: " + e.message }, 500);
        }
    });

    router.delete("/api/usuarios/avatar", autenticar, async (req, res) => {
        try {
            await cloudinary.uploader.destroy(`taskflow/avatars/${req.usuario.id}`).catch(() => {});
            await db.atualizarAvatar(req.usuario.id, null);
            res.json({ mensagem: "Avatar removido." });
        } catch(e) {
            res.json({ erro: "Erro ao remover avatar." }, 500);
        }
    });
}

module.exports = { registrar };