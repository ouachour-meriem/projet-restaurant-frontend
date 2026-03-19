const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"]
        }
      ]
    });

    if (!user) return res.status(401).json({ message: "Email ou mot de passe invalide" });

    const hashMatch = await bcrypt.compare(password, user.password).catch(() => false);
    const plainMatch = password === user.password;

    if (!hashMatch && !plainMatch) {
      return res.status(401).json({ message: "Email ou mot de passe invalide" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_id: user.role_id
      },
      process.env.JWT_SECRET || "dev_secret_change_me",
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la connexion",
      error: error.message
    });
  }
};

module.exports = { login };

