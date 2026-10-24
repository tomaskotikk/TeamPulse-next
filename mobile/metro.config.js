// The Next.js app lives in the parent folder with its own node_modules (different React).
// Block that folder so Metro never resolves a second copy of React from it.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const parentModules = path.resolve(__dirname, '..', 'node_modules')
const separators = '[\\\\/]'
const pattern = escapeRegExp(parentModules).split(/\\\\|\//).join(separators)

config.resolver.blockList = [new RegExp(`^${pattern}${separators}.*`)]
config.watchFolders = [__dirname]

module.exports = config
