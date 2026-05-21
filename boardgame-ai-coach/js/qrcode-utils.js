/**
 * 桌游AI教练 - 二维码工具模块
 * 提供二维码生成、卡片绘制、批量下载等功能
 */
console.log('[qrcode-utils.js] 开始加载...');

var QRUtils = (function() {
    'use strict';

    var SITE_URL = 'https://boardgame-ai.pages.dev';
    var CARD_W = 300;
    var CARD_H = 400;

    /**
     * 生成单个游戏URL
     */
    function getGameUrl(gameId, mode) {
        mode = mode || '';
        if (mode === 'setup') return SITE_URL + '/#/chat?id=' + gameId + '&mode=setup';
        if (mode === 'quick') return SITE_URL + '/#/chat?id=' + gameId + '&mode=quick';
        return SITE_URL + '/#/chat?id=' + gameId;
    }

    /**
     * 在Canvas上绘制圆角矩形
     */
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * 绘制通用二维码卡片到 Canvas
     * @param {HTMLCanvasElement} canvas - 目标画布
     * @param {string} qrUrl - 二维码内容URL
     * @param {object} opts - { title, subtitle, urlText, titleSize }
     * @returns {Promise}
     */
    function drawQRCard(canvas, qrUrl, opts) {
        opts = opts || {};
        var title = opts.title || '桌游AI教练';
        var subtitle = opts.subtitle || '扫码开始学习桌游规则';
        var urlText = opts.urlText || SITE_URL.replace('https://', '');
        var titleSize = opts.titleSize || 16;

        var dpr = window.devicePixelRatio || 1;
        var W = CARD_W * dpr;
        var H = CARD_H * dpr;
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = CARD_W + 'px';
        canvas.style.height = CARD_H + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 白色背景圆角卡片
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, 0, 0, CARD_W, CARD_H, 16);
        ctx.fill();

        // 边框
        ctx.strokeStyle = '#E5E0D8';
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, CARD_W - 1, CARD_H - 1, 16);
        ctx.stroke();

        // 先画文字，再异步画二维码
        // 标题
        ctx.fillStyle = '#2D2A26';
        ctx.font = 'bold ' + titleSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, CARD_W / 2, CARD_H - 100);

        // 副标题
        ctx.fillStyle = '#8C8578';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, CARD_W / 2, CARD_H - 78);

        // URL文字
        ctx.fillStyle = '#B5AFA6';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(urlText, CARD_W / 2, CARD_H - 58);

        // 二维码放在上方区域 (用Img绘制)
        var qrSize = 180;
        var qrX = (CARD_W - qrSize) / 2;
        var qrY = 30;

        return new Promise(function(resolve, reject) {
            // 使用临时div生成二维码
            var tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            document.body.appendChild(tempDiv);

            try {
                var qrCode = new QRCode(tempDiv, {
                    text: qrUrl,
                    width: qrSize * dpr,
                    height: qrSize * dpr,
                    colorDark: '#2D2A26',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // 等待二维码渲染完成
                setTimeout(function() {
                    var qrImg = tempDiv.querySelector('img');
                    // 有些版本用canvas
                    var qrCanvas = tempDiv.querySelector('canvas');
                    if (qrImg) {
                        var img = new Image();
                        img.onload = function() {
                            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                            document.body.removeChild(tempDiv);
                            resolve(canvas);
                        };
                        img.onerror = function() {
                            document.body.removeChild(tempDiv);
                            reject(new Error('QR image load failed'));
                        };
                        img.src = qrImg.src;
                    } else if (qrCanvas) {
                        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
                        document.body.removeChild(tempDiv);
                        resolve(canvas);
                    } else {
                        document.body.removeChild(tempDiv);
                        reject(new Error('QR render failed'));
                    }
                }, 300);
            } catch (e) {
                document.body.removeChild(tempDiv);
                reject(e);
            }
        });
    }

    /**
     * 生成总入口二维码卡片
     * @returns {Promise<HTMLCanvasElement>}
     */
    function generateSiteQRCard() {
        var canvas = document.createElement('canvas');
        return drawQRCard(canvas, SITE_URL, {
            title: '桌游AI教练',
            subtitle: '扫码开始学习桌游规则',
            urlText: 'boardgame-ai.pages.dev'
        });
    }

    /**
     * 生成游戏详情二维码卡片（含模式）
     * @param {string} gameId - 游戏ID
     * @param {string} gameName - 游戏名称
     * @param {string} mode - setup/rules/quick
     * @returns {Promise<HTMLCanvasElement>}
     */
    function generateGameQRCard(gameId, gameName, mode) {
        mode = mode || 'rules';
        var modeNames = { setup: '摆盘引导', rules: '规则教学', quick: '规则速查' };
        var modeName = modeNames[mode] || '规则教学';
        var url = getGameUrl(gameId, mode);

        var canvas = document.createElement('canvas');
        return drawQRCard(canvas, url, {
            title: '扫码学习',
            subtitle: gameName + ' \u00b7 ' + modeName,
            urlText: 'boardgame-ai.pages.dev'
        });
    }

    /**
     * 下载Canvas为PNG图片
     * @param {HTMLCanvasElement} canvas
     * @param {string} filename
     */
    function downloadCanvas(canvas, filename) {
        var link = document.createElement('a');
        link.download = filename || '二维码.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 批量生成游戏二维码并打包ZIP下载
     * @param {Array} games - 游戏列表
     */
    async function downloadAllQRZip(games) {
        if (!games || games.length === 0) {
            alert('暂无游戏数据');
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert('JSZip库未加载，请检查网络连接');
            return;
        }
        if (typeof saveAs === 'undefined') {
            alert('FileSaver库未加载，请检查网络连接');
            return;
        }

        var zip = new JSZip();
        var total = games.length;

        // 显示进度提示
        var progressEl = document.getElementById('batch-qr-progress');
        if (progressEl) {
            progressEl.style.display = 'block';
            progressEl.textContent = '正在生成二维码... 0/' + total;
        }

        for (var i = 0; i < total; i++) {
            var game = games[i];
            var gameName = (game.name || '游戏' + (i + 1)).replace(/[\\/:*?"<>|]/g, '_');

            try {
                var canvas = document.createElement('canvas');
                await drawQRCard(canvas, getGameUrl(game.id), {
                    title: '桌游AI教练',
                    subtitle: gameName,
                    urlText: 'boardgame-ai.pages.dev',
                    titleSize: 14
                });

                var dataUrl = canvas.toDataURL('image/png');
                var base64 = dataUrl.split(',')[1];
                zip.file(gameName + '-二维码.png', base64, { base64: true });

                if (progressEl) {
                    progressEl.textContent = '正在生成二维码... ' + (i + 1) + '/' + total;
                }
            } catch (e) {
                console.error('生成二维码失败:', gameName, e);
            }
        }

        if (progressEl) {
            progressEl.textContent = '正在打包下载...';
        }

        try {
            var blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, '桌游AI教练-全部二维码.zip');
            if (progressEl) {
                progressEl.style.display = 'none';
            }
        } catch (e) {
            console.error('打包失败:', e);
            if (progressEl) {
                progressEl.style.display = 'none';
            }
            alert('打包下载失败: ' + (e.message || '未知错误'));
        }
    }

    /**
     * 生成批量二维码分页预览HTML
     * @param {Array} games - 游戏列表
     * @param {number} page - 页码(0-based)
     * @param {number} perPage - 每页数量
     * @returns {string} HTML字符串
     */
    function renderBatchQRGrid(games, page, perPage) {
        page = page || 0;
        perPage = perPage || 6;
        var total = games.length;
        var totalPages = Math.ceil(total / perPage);
        var start = page * perPage;
        var end = Math.min(start + perPage, total);

        var html = '';
        for (var i = start; i < end; i++) {
            var game = games[i];
            var gameName = game.name || '游戏' + (i + 1);
            var players = (game.min_players || game.minPlayers || '?') + '-' + (game.max_players || game.maxPlayers || '?') + '人';
            var duration = (game.duration || '?') + '分钟';
            var url = getGameUrl(game.id);

            html += '<div class="batch-qr-item" id="batch-qr-item-' + i + '" style="background:#FFFFFF;border:1px solid #E5E0D8;border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;margin-bottom:12px;">' +
                '<div class="batch-qr-img" id="batch-qr-img-' + i + '" style="width:80px;height:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#F0EDE6;border-radius:8px;"></div>' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:4px;">' + escapeHtml(gameName) + '</div>' +
                '<div style="font-size:12px;color:#8C8578;">👥 ' + players + '  ⏱ ' + duration + '</div>' +
                '<div style="font-size:11px;color:#B5AFA6;margin-top:2px;word-break:break-all;">' + escapeHtml(url) + '</div>' +
                '</div>' +
                '<button onclick="QRUtils.downloadSingleQR(\'' + game.id + '\',\'' + escapeHtml(gameName).replace(/'/g, "\\'") + '\')" style="flex-shrink:0;padding:8px 12px;background:#C4864B;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;">保存</button>' +
                '</div>';
        }

        // 分页导航
        var pagerHtml = '';
        if (totalPages > 1) {
            pagerHtml = '<div style="display:flex;justify-content:center;align-items:center;gap:12px;padding:12px 0;">' +
                '<button onclick="profilePage.batchQRPrevPage()" style="padding:8px 16px;background:#F0EDE6;color:#2D2A26;border:1px solid #E5E0D8;border-radius:8px;cursor:pointer;' + (page === 0 ? 'opacity:0.4;pointer-events:none;' : '') + '">上一页</button>' +
                '<span style="color:#2D2A26;font-size:14px;">' + (page + 1) + ' / ' + totalPages + '</span>' +
                '<button onclick="profilePage.batchQRNextPage()" style="padding:8px 16px;background:#F0EDE6;color:#2D2A26;border:1px solid #E5E0D8;border-radius:8px;cursor:pointer;' + (page >= totalPages - 1 ? 'opacity:0.4;pointer-events:none;' : '') + '">下一页</button>' +
                '</div>';
        }

        return '<div class="batch-qr-grid" style="padding:16px;">' +
            '<div style="color:#8C8578;font-size:13px;margin-bottom:12px;">共 ' + total + ' 个游戏（每页' + perPage + '个，可截图或点击"下载全部"打包ZIP）</div>' +
            html +
            pagerHtml +
            '</div>';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 公开API
    return {
        SITE_URL: SITE_URL,
        CARD_W: CARD_W,
        CARD_H: CARD_H,
        getGameUrl: getGameUrl,
        drawQRCard: drawQRCard,
        generateSiteQRCard: generateSiteQRCard,
        generateGameQRCard: generateGameQRCard,
        downloadCanvas: downloadCanvas,
        downloadAllQRZip: downloadAllQRZip,
        renderBatchQRGrid: renderBatchQRGrid,
        escapeHtml: escapeHtml
    };
})();

// 单独下载单个游戏二维码
QRUtils.downloadSingleQR = async function(gameId, gameName) {
    try {
        var games = window.allGames || [];
        var game = null;
        for (var i = 0; i < games.length; i++) {
            if (String(games[i].id) === String(gameId)) { game = games[i]; break; }
        }
        if (!game) { game = { id: gameId, name: gameName }; }

        var canvas = await QRUtils.generateGameQRCard(game.id, game.name || gameName, 'rules');
        QRUtils.downloadCanvas(canvas, (game.name || gameName) + '-二维码.png');
    } catch (e) {
        console.error('下载失败:', e);
        alert('下载失败: ' + e.message);
    }
};

// 挂载到全局
window.QRUtils = QRUtils;
window.qrUtils = QRUtils;

console.log('[qrcode-utils.js] 加载完成');
