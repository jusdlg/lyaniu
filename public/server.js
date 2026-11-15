const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ========= 配置区 =========
const ADMIN_PASS = "#123456"; // 和上面网页管理员密码保持一致
const TARGET_FOLDER = "F:/管理员"; // 这里改成你F盘的文件夹路径！！
const PORT = 8877;
// ==========================

// 校验密码
function checkAuth(req){
  const pwd = req.headers['x-admin-pwd'];
  return pwd === ADMIN_PASS;
}

// 读取文件列表
app.get('/list', (req,res)=>{
  if(!checkAuth(req)) return res.status(403).json({ok:false,msg:"权限不足"});
  try{
    const list = fs.readdirSync(TARGET_FOLDER,{withFileStats:true});
    const data = list.map(item=>({
      name: item.name,
      isDir: item.isDirectory(),
      size: item.size,
      mtime: item.mtime
    }))
    res.json({ok:true, list:data})
  }catch(e){
    res.json({ok:false, msg:e.message})
  }
})

// 删除文件
app.post('/delete', (req,res)=>{
  if(!checkAuth(req)) return res.status(403).json({ok:false,msg:"权限不足"});
  const filename = req.body.name;
  const safePath = path.join(TARGET_FOLDER, filename);
  // 简单防越权，防止跑到别的盘
  if(!safePath.startsWith(path.resolve(TARGET_FOLDER))){
    return res.json({ok:false,msg:"非法路径"})
  }
  try{
    const stat = fs.statSync(safePath);
    if(stat.isDirectory()){
      fs.rmSync(safePath, {recursive:true,force:true})
    }else{
      fs.unlinkSync(safePath)
    }
    res.json({ok:true})
  }catch(e){
    res.json({ok:false, msg:e.message})
  }
})

// 静态访问文件（可以下载预览）
app.use(express.static(TARGET_FOLDER));

// 简易管理页面
app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>作品管理后台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui}
body{padding:24px;max-width:900px;margin:0 auto;background:#f5f5f5}
.card{background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px #00000015}
.item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee}
.del{background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer}
a{color:#07c160;text-decoration:none;margin-right:10px}
h1{margin-bottom:16px;font-size:22px}
</style>
</head>
<body>
<div class="card">
<h1>📂 F盘作品管理</h1>
<div id="fileList"></div>
</div>
<script>
const pwd = "${ADMIN_PASS}";
async function load(){
  const r = await fetch("/list",{headers:{"x-admin-pwd":pwd}})
  const d = await r.json();
  if(!d.ok) return alert(d.msg);
  let html = "";
  d.list.forEach(f=>{
    html += \`<div class="item">
      <div><a href="\${f.name}" target="_blank">\${f.name}</a> \${f.isDir?"📁":"📄"}</div>
      <button class="del" onclick="del('\${f.name}')">删除</button>
    </div>\`
  })
  document.getElementById("fileList").innerHTML = html || "<p>文件夹为空</p>";
}
async function del(name){
  if(!confirm("确定删除【"+name+"】？删除无法恢复！")) return;
  const r = await fetch("/delete",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-admin-pwd":pwd},
    body:JSON.stringify({name})
  })
  const d = await r.json();
  alert(d.ok?"删除成功":"失败："+d.msg);
  load();
}
load();
</script>
</body>
</html>
`)
})

app.listen(PORT,()=>{
  console.log(`✅ 管理后台启动：http://127.0.0.1:${PORT}`)
  console.log(`📂 管理目录：${TARGET_FOLDER}`)
})
