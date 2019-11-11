"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const osPlat = os.platform();
const osArch = os.arch();
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\';
    }
    else if (process.platform === 'darwin') {
        baseLocation = '/Users';
    }
    else {
        baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
const availableVersions = process.platform === 'win32'
    ? [
        // available versions in windows
        '5.30.1',
        '5.30.0',
        '5.28.2',
        '5.28.1',
        '5.28.0',
        '5.26.3',
        '5.26.2',
        '5.26.1',
        '5.26.0',
        '5.24.4',
        '5.24.3',
        '5.24.2',
        '5.24.1',
        '5.24.0'
    ]
    : [
        // available versions in linux and macOS
        '5.30.1',
        '5.30.0',
        '5.28.2',
        '5.28.1',
        '5.28.0',
        '5.26.3',
        '5.26.2',
        '5.26.1',
        '5.26.0',
        '5.24.4',
        '5.24.3',
        '5.24.2',
        '5.24.1',
        '5.24.0',
        '5.22.4',
        '5.22.3',
        '5.22.2',
        '5.22.1',
        '5.22.0',
        '5.20.3',
        '5.20.2',
        '5.20.1',
        '5.20.0',
        '5.18.4',
        '5.18.3',
        '5.18.2',
        '5.18.1',
        '5.18.0',
        '5.16.3',
        '5.16.2',
        '5.16.1',
        '5.16.0',
        '5.14.4',
        '5.14.3',
        '5.14.2',
        '5.14.1',
        '5.14.0',
        '5.12.5',
        '5.12.4',
        '5.12.3',
        '5.12.2',
        '5.12.1',
        '5.12.0',
        '5.10.1',
        '5.10.1',
        '5.10.0',
        '5.8.9',
        '5.8.8',
        '5.8.7',
        '5.8.6',
        '5.8.5'
    ];
function determineVersion(version) {
    for (let v of availableVersions) {
        if (semver.satisfies(v, version)) {
            return v;
        }
    }
    throw new Error('unable to get latest version');
}
async function getPerl(version) {
    const selected = determineVersion(version);
    // check cache
    let toolPath;
    toolPath = tc.find('perl', selected);
    if (!toolPath) {
        // download, extract, cache
        toolPath = await acquirePerl(selected);
        core.debug('Perl tool is cached under ' + toolPath);
    }
    toolPath = path.join(toolPath, 'bin');
    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    core.addPath(toolPath);
}
exports.getPerl = getPerl;
async function acquirePerl(version) {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    const fileName = getFileName(version);
    const downloadUrl = await getDownloadUrl(fileName);
    let downloadPath = null;
    try {
        downloadPath = await tc.downloadTool(downloadUrl);
    }
    catch (error) {
        core.debug(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    //
    // Extract
    //
    let extPath = tempDirectory;
    if (!extPath) {
        throw new Error('Temp directory not set');
    }
    if (osPlat == 'win32') {
        extPath = await tc.extractZip(downloadPath);
    }
    else {
        extPath = await tc.extractTar(downloadPath);
    }
    return await tc.cacheDir(extPath, 'perl', version);
}
function getFileName(version) {
    return `perl-${version}-${osPlat}-${osArch}.tar.gz`;
}
async function getDownloadUrl(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', 'package.json'), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = JSON.parse(data.toString());
            resolve(info);
        });
    }).then(info => {
        const actionsVersion = info.version;
        return `https://shogo82148-actions-setup-perl.s3.amazonaws.com/v${actionsVersion}/${filename}`;
    });
}