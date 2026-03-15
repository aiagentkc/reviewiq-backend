// config/reviewForm.js v3
function generateReviewForm(clientId, bizName, logoUrl, brandColor) {
  var color = brandColor || '#6366f1';
  var logoHTML = logoUrl
    ? '<div style="text-align:center;margin-bottom:24px;"><img src="' + logoUrl + '" style="max-height:70px;max-width:220px;" alt="logo"></div>'
    : '<div style="text-align:center;font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">' + bizName + '</div>';

  var html = [];
  html.push('<!DOCTYPE html>');
  html.push('<html lang="en">');
  html.push('<head>');
  html.push('<meta charset="UTF-8">');
  html.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  html.push('<title>Rate Your Experience - ' + bizName + '</title>');
  html.push('</head>');
  html.push('<body style="font-family:sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;margin:0;">');
  html.push('<div style="background:white;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,0.08);">');
  html.push('<div id="form-section">');
  html.push(logoHTML);
  html.push('<h1 style="font-size:22px;color:#0f172a;margin:0 0 8px 0;">How was your visit?</h1>');
  html.push('<p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px 0;">Your feedback helps ' + bizName + ' serve you better.</p>');
  html.push('<p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">YOUR RATING</p>');
  html.push('<div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;" id="stars">');
  html.push('<span id="s1" style="font-size:52px;color:#d1d5db;cursor:pointer;" onclick="pick(1)">&#9733;</span>');
  html.push('<span id="s2" style="font-size:52px;color:#d1d5db;cursor:pointer;" onclick="pick(2)">&#9733;</span>');
  html.push('<span id="s3" style="font-size:52px;color:#d1d5db;cursor:pointer;" onclick="pick(3)">&#9733;</span>');
  html.push('<span id="s4" style="font-size:52px;color:#d1d5db;cursor:pointer;" onclick="pick(4)">&#9733;</span>');
  html.push('<span id="s5" style="font-size:52px;color:#d1d5db;cursor:pointer;" onclick="pick(5)">&#9733;</span>');
  html.push('</div>');
  html.push('<div id="star-msg" style="text-align:center;font-size:14px;color:#6366f1;font-weight:600;min-height:24px;margin-bottom:16px;"></div>');
  html.push('<div id="low-msg" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;color:#92400e;display:none;">We\'re sorry to hear that. Your feedback goes directly to the team privately and will never be posted publicly.</div>');
  html.push('<p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">YOUR NAME</p>');
  html.push('<input type="text" id="author" placeholder="First name" oninput="chk()" style="width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:14px;display:block;box-sizing:border-box;">');
  html.push('<p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">YOUR EXPERIENCE</p>');
  html.push('<textarea id="txt" placeholder="What did you love? What could we improve?" oninput="chk()" style="width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:14px;min-height:110px;margin-bottom:14px;display:block;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>');
  html.push('<button id="btn" onclick="sub()" disabled style="width:100%;background:' + color + ';color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;opacity:0.4;">Submit Review</button>');
  html.push('</div>');
  html.push('<div id="done" style="text-align:center;padding:20px 0;display:none;">');
  html.push('<div style="font-size:64px;margin-bottom:16px;">&#11088;</div>');
  html.push('<h1 style="font-size:22px;color:#0f172a;">Thank you!</h1>');
  html.push('<p style="color:#64748b;margin-top:12px;">Your feedback means a lot to the team at ' + bizName + '.</p>');
  html.push('</div>');
  html.push('</div>');
  html.push('<script>');
  html.push('var R=0,CID="' + clientId + '",LB={1:"Poor",2:"Fair",3:"Good",4:"Great",5:"Excellent!"};');
  html.push('function paint(n){for(var i=1;i<=5;i++)document.getElementById("s"+i).style.color=i<=n?"#f59e0b":"#d1d5db";}');
  html.push('function pick(n){R=n;paint(n);document.getElementById("star-msg").textContent=LB[n];document.getElementById("low-msg").style.display=n<5?"block":"none";chk();}');
  html.push('function chk(){var ok=R>0&&document.getElementById("author").value.trim().length>1&&document.getElementById("txt").value.trim().length>10;var b=document.getElementById("btn");b.disabled=!ok;b.style.opacity=ok?"1":"0.4";}');
  html.push('function sub(){var b=document.getElementById("btn");b.disabled=true;b.textContent="Submitting...";');
  html.push('fetch("/api/clients/"+CID+"/screening/submit",{method:"POST",headers:{"Content-Type":"application/json"},');
  html.push('body:JSON.stringify({author:document.getElementById("author").value.trim(),rating:R,text:document.getElementById("txt").value.trim()})})');
  html.push('.then(function(){document.getElementById("form-section").style.display="none";document.getElementById("done").style.display="block";})');
  html.push('.catch(function(){b.disabled=false;b.textContent="Try again";});}');
  html.push('</script>');
  html.push('</body>');
  html.push('</html>');
  return html.join('\n');
}
module.exports = { generateReviewForm };
