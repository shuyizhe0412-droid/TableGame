// ============ 批量二维码 ============

let batchQrGames = [];
let batchQrCurrentPage = 1;
const batchQrPageSize = 6;
let batchQrInitialized = false;

function initBatchQr() {
  if (batchQrInitialized) return;
  batchQrInitialized = true;

  const modal = document.getElementById('batch-qr-modal');
  const closeBtn = document.getElementById('batch-qr-close-btn');
  const downloadAllBtn = document.getElementById('batch-qr-download-all');
  const batchQrBtn = document.getElementById('batch-qr-btn');

  if (!modal || !closeBtn || !downloadAllBtn || !batchQrBtn) return;

  batchQrBtn.addEventListener('click', openBatchQrModal);

  closeBtn.addEventListener('click', closeBatchQrModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeBatchQrModal();
  });

  downloadAllBtn.addEventListener('click', downloadAllQrCodes);
}

async function openBatchQrModal() {
  const modal = document.getElementById('batch-qr-modal');
  if (!modal) return;

  try {
    batchQrGames = await apiFetch('/games');
    batchQrCurrentPage = 1;
    renderBatchQrPage();
    modal.style.display = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeBatchQrModal() {
  const modal = document.getElementById('batch-qr-modal');
  if (modal) modal.style.display = 'none';
}

function renderBatchQrPage() {
  const grid = document.getElementById('batch-qr-grid');
  const pagination = document.getElementById('batch-qr-pagination');
  if (!grid) return;

  const totalPages = Math.ceil(batchQrGames.length / batchQrPageSize);
  const start = (batchQrCurrentPage - 1) * batchQrPageSize;
  const end = start + batchQrPageSize;
  const pageGames = batchQrGames.slice(start, end);

  const shopId = currentUser && currentUser.id ? currentUser.id : '';

  grid.innerHTML = pageGames.map(g => {
    const gameUrl = 'https://boardgame-ai.pages.dev/#/chat?id=' + g.id + '&shop=' + shopId;
    const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(gameUrl);
    const players = (g.min_players && g.max_players) ? g.min_players + '-' + g.max_players + '人' : '';
    const duration = g.duration ? g.duration + '分钟' : '';

    return '' +
      '<div class="batch-qr-card">' +
      '<img src="' + qrApi + '" alt="' + g.name + '">' +
      '<div class="game-name">' + g.name + '</div>' +
      '<div class="game-meta">' + players + ' ' + duration + '</div>' +
      '<button class="btn btn-outline btn-download-single" data-id="' + g.id + '" data-name="' + g.name + '">下载</button>' +
      '</div>';
  }).join('');

  if (pagination) {
    const prevDisabled = batchQrCurrentPage <= 1 ? 'disabled' : '';
    const nextDisabled = batchQrCurrentPage >= totalPages ? 'disabled' : '';
    pagination.innerHTML = '' +
      '<button class="btn btn-ghost btn-sm" id="batch-qr-prev" ' + prevDisabled + '>上一页</button>' +
      '<span class="page-info">第 ' + batchQrCurrentPage + ' / ' + totalPages + ' 页</span>' +
      '<button class="btn btn-ghost btn-sm" id="batch-qr-next" ' + nextDisabled + '>下一页</button>';

    const prevBtn = document.getElementById('batch-qr-prev');
    const nextBtn = document.getElementById('batch-qr-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (batchQrCurrentPage > 1) {
          batchQrCurrentPage--;
          renderBatchQrPage();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (batchQrCurrentPage < totalPages) {
          batchQrCurrentPage++;
          renderBatchQrPage();
        }
      });
    }
  }

  grid.querySelectorAll('.btn-download-single').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = btn.getAttribute('data-id');
      const gameName = btn.getAttribute('data-name');
      downloadSingleQr(gameId, gameName);
    });
  });
}

async function downloadAllQrCodes() {
  if (batchQrGames.length === 0) {
    showToast('没有可下载的二维码', 'error');
    return;
  }

  showToast('正在打包下载，请稍候...', 'success');

  try {
    if (typeof JSZip === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js');
    }
    if (typeof saveAs === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2/dist/FileSaver.min.js');
    }

    const zip = new JSZip();
    const shopId = currentUser && currentUser.id ? currentUser.id : '';

    for (const g of batchQrGames) {
      const gameUrl = 'https://boardgame-ai.pages.dev/#/chat?id=' + g.id + '&shop=' + shopId;
      const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(gameUrl);
      try {
        const response = await fetch(qrApi);
        const blob = await response.blob();
        zip.file(g.name + '.png', blob);
      } catch (e) {
        console.warn('Failed to download QR for ' + g.name);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, '桌游二维码_' + (currentUser && currentUser.store_name ? currentUser.store_name : '店家') + '.zip');
    showToast('下载完成');
  } catch (err) {
    showToast('打包失败: ' + err.message, 'error');
  }
}

function downloadSingleQr(gameId, gameName) {
  const shopId = currentUser && currentUser.id ? currentUser.id : '';
  const gameUrl = 'https://boardgame-ai.pages.dev/#/chat?id=' + gameId + '&shop=' + shopId;
  const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(gameUrl);

  const link = document.createElement('a');
  link.href = qrApi;
  link.download = gameName + '_二维码.png';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 初始化：在 DOM 就绪后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBatchQr);
} else {
  initBatchQr();
}
