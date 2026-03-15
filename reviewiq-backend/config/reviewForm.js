// config/reviewForm.js
// Generates the customer-facing review form HTML

function generateReviewForm(clientId, bizName, logoUrl, brandColor) {
  const color = brandColor || '#6366f1';
  const logo = logoUrl || '';

  const logoHTML = logo
    ? '<div class="logo-wrap"><img src="' + logo + '" alt="' + bizName + ' logo"/></div>'
    : '<div class="biz-name">' + bizName + '</div>';

  const css = [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}',
    '.card{background:white;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,0.08);}',
    '.logo-wrap{text-align:center;margin-bottom:24px;}',
    '.logo-wrap img{max-height:70px;max-width:220px;object-fit:contain;}',
    '.biz-name{text-align:center;font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px;}',
    'h1{font-size:22px;color:#0f172a;margin-bottom:8px;}',
    'p{color:#64748b;font-size:15px;line-height:1.6;margin-bottom:24px;}',
    '.stars{display:flex;gap:10px;margin-bottom:8px;justify-content:center;}',
    '.star{font-size:48px;cursor:pointer;color:#e2e8f0;transition:transform 0.1s,color 0.1s;user-select:none;line-height:1;display:inline-block;}',
    '.star.active{color:#f59e0b;}',
    '.star-label{text-align:center;font-size:13px;color:#64748b;margin-bottom:20px;min-height:20px;}',
    'input,textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:14px;font-family:inherit;color:#0f172a;margin-bottom:14px;}',
    'input:focus,textarea:focus{outline:none;border-color:' + color + ';}',
    'textarea{resize:vertical;min-height:110px;}',
    'button{width:100%;background:' + color + ';color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;}',
    'button:disabled{opacity:0.4;cursor:not-allowed;}',
    '.label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:8px;}',
    '.success{text-align:center;padding:20px 0;}',
    '.success .icon{font-size:60px;margin-bottom:16px;}',
    '.hidden{display:none;}',
    '.low-star-msg{background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px;margin-bottom:16px;font-size:13px;color:#92400e;line-height:1.6;}',
  ].join('\n    ');

  return '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  <title>Rate Your Experience â€” ' + bizName + '</title>\n' +
    '  <style>\n    ' + css + '\n  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div class="card">\n' +
    '    <div id="form-view">\n' +
    '      ' + logoHTML + '\n' +
    '      <h1>How was your visit?</h1>\n' +
    '      <p>Your feedback helps ' + bizName + ' serve you better.</p>\n' +
    '      <span class="label">Your rating</span>\n' +
    '      <div class="stars" id="stars">\n' +
    '        <span class="star" data-rating="1">&#9733;</span>\n' +
    '        <span class="star" data-rating="2">&#9733;</span>\n' +
    '        <span class="star" data-rating="3">&#9733;</span>\n' +
    '        <span class="star" data-rating="4">&#9733;</span>\n' +
    '        <span class="star" data-rating="5">&#9733;</span>\n' +
    '      </div>\n' +
    '      <div class="star-label" id="star-label"></div>\n' +
    '      <div id="low-star-msg" class="low-star-msg hidden">We\'re sorry to hear that. Your feedback goes directly to the team privately and will never be posted publicly.</div>\n' +
    '      <span class="label">Your name</span>\n' +
    '      <input type="text" id="author" placeholder="First name"/>\n' +
    '      <span class="label">Tell us about your experience</span>\n' +
    '      <textarea id="review-text" placeholder="What did you love? What could we improve?"></textarea>\n' +
    '      <button id="submit-btn" disabled>Submit Review</button>\n' +
    '    </div>\n' +
    '    <div id="success-view" class="success hidden">\n' +
    '      <div class="icon">&#11088;</div>\n' +
    '      <h1>Thank you!</h1>\n' +
    '      <p style="margin-top:12px;">Your feedback means a lot to the team at ' + bizName + '.</p>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <script>\n' +
    '    var rating = 0;\n' +
    '    var clientId = "' + clientId + '";\n' +
    '    var labels = {1:"Poor",2:"Fair",3:"Good",4:"Great",5:"Excellent!"};\n' +
    '    var stars = document.querySelectorAll(".star");\n' +
    '    var submitBtn = document.getElementById("submit-btn");\n' +
    '\n' +
    '    stars.forEach(function(star) {\n' +
    '      star.addEventListener("click", function() {\n' +
    '        rating = parseInt(this.getAttribute("data-rating"));\n' +
    '        stars.forEach(function(s) {\n' +
    '          if (parseInt(s.getAttribute("data-rating")) <= rating) {\n' +
    '            s.classList.add("active");\n' +
    '          } else {\n' +
    '            s.classList.remove("active");\n' +
    '          }\n' +
    '        });\n' +
    '        document.getElementById("star-label").textContent = labels[rating] || "";\n' +
    '        var msg = document.getElementById("low-star-msg");\n' +
    '        if (rating < 5) { msg.classList.remove("hidden"); } else { msg.classList.add("hidden"); }\n' +
    '        updateBtn();\n' +
    '      });\n' +
    '      star.addEventListener("mouseover", function() {\n' +
    '        var h = parseInt(this.getAttribute("data-rating"));\n' +
    '        stars.forEach(function(s) {\n' +
    '          s.style.color = parseInt(s.getAttribute("data-rating")) <= h ? "#f59e0b" : "#e2e8f0";\n' +
    '        });\n' +
    '        document.getElementById("star-label").textContent = labels[h] || "";\n' +
    '      });\n' +
    '      star.addEventListener("mouseout", function() {\n' +
    '        stars.forEach(function(s) {\n' +
    '          s.style.color = "";\n' +
    '          if (parseInt(s.getAttribute("data-rating")) <= rating) { s.classList.add("active"); } else { s.classList.remove("active"); }\n' +
    '        });\n' +
    '        document.getElementById("star-label").textContent = rating ? labels[rating] : "";\n' +
    '      });\n' +
    '    });\n' +
    '\n' +
    '    document.getElementById("author").addEventListener("input", updateBtn);\n' +
    '    document.getElementById("review-text").addEventListener("input", updateBtn);\n' +
    '\n' +
    '    function updateBtn() {\n' +
    '      var hasRating = rating > 0;\n' +
    '      var hasAuthor = document.getElementById("author").value.trim().length > 1;\n' +
    '      var hasText = document.getElementById("review-text").value.trim().length > 10;\n' +
    '      submitBtn.disabled = !(hasRating && hasAuthor && hasText);\n' +
    '    }\n' +
    '\n' +
    '    submitBtn.addEventListener("click", function() {\n' +
    '      submitBtn.disabled = true;\n' +
    '      submitBtn.textContent = "Submitting...";\n' +
    '      fetch("/api/clients/" + clientId + "/screening/submit", {\n' +
    '        method: "POST",\n' +
    '        headers: {"Content-Type": "application/json"},\n' +
    '        body: JSON.stringify({\n' +
    '          author: document.getElementById("author").value.trim(),\n' +
    '          rating: rating,\n' +
    '          text: document.getElementById("review-text").value.trim()\n' +
    '        })\n' +
    '      }).then(function() {\n' +
    '        document.getElementById("form-view").classList.add("hidden");\n' +
    '        document.getElementById("success-view").classList.remove("hidden");\n' +
    '      }).catch(function() {\n' +
    '        submitBtn.disabled = false;\n' +
    '        submitBtn.textContent = "Try again";\n' +
    '      });\n' +
    '    });\n' +
    '  </script>\n' +
    '</body>\n' +
    '</html>';
}

module.exports = { generateReviewForm };
