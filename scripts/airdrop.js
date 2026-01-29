// import fs from "fs";
// import path from "path";
// import { exec } from "child_process";

// // 扫描阶段使用相对路径
// const TARGET_DIR = "./pack";

// function findLatestFile(dir) {
//   const entries = fs.readdirSync(dir, { withFileTypes: true });

//   const files = entries
//     .filter(e => e.isFile())
//     .map(e => {
//       const relativePath = path.join(dir, e.name);
//       const stat = fs.statSync(relativePath);
//       return {
//         relativePath,
//         mtime: stat.mtimeMs
//       };
//     });

//   if (files.length === 0) {
//     throw new Error("目录中没有可用文件");
//   }

//   files.sort((a, b) => b.mtime - a.mtime);
//   return files[0].relativePath;
// }

// function sendViaAirDrop(relativeFilePath) {
//   const absolutePath = path.resolve(relativeFilePath);

//   const script = `
// osascript <<'EOF'
// tell application "Finder"
//     activate
//     open POSIX file "${absolutePath}"
// end tell
// EOF
// `;

//   exec(script, err => {
//     if (err) {
//       console.error("AirDrop 调用失败:", err);
//       return;
//     }
//     console.log("已通过 AirDrop 打开文件:", absolutePath);
//   });
// }

// try {
//   const latestFile = findLatestFile(TARGET_DIR);
//   sendViaAirDrop(latestFile);
// } catch (e) {
//   console.error(e.message);
// }
