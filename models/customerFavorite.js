const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CustomerFavorite = sequelize.define(
  "CustomerFavorite",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    }
  },
  {
    tableName: "customer_favorites",
    timestamps: false
  }
);

module.exports = CustomerFavorite;
