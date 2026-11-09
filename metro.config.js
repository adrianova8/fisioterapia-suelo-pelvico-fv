// Metro (empaquetador de la app) no debe mirar la carpeta backend/:
// es otro proyecto (Next.js) con sus propias dependencias.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const backend = path.resolve(__dirname, "backend").replace(/[/\\]/g, "[/\\\\]");
config.resolver.blockList = [new RegExp(`^${backend}[/\\\\].*`)];

module.exports = config;
