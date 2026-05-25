/**
 * 桌游AI教练 - 二维码工具模块
 * 提供二维码生成、卡片绘制、批量下载等功能
 * 已适配：微信/QQ内置浏览器（CDN本地化、长按保存、toDataURL兜底）
 */
console.log('[qrcode-utils.js] 开始加载...');

var QRUtils = (function() {
    'use strict';

    var SITE_URL = 'https://boardgame-ai.pages.dev';
    var CARD_W = 300;
    var CARD_H = 400;
    var QR_SIZE = 180;
    var QR_Y = 30;

    // ==================== 环境检测 ====================

    /** 是否在微信浏览器中 */
    function isWechat() {
        return /MicroMessenger/i.test(navigator.userAgent);
    }

    /** 是否在QQ浏览器中 */
    function isQQ() {
        return /QQ\//i.test(navigator.userAgent) && !/MicroMessenger/i.test(navigator.userAgent);
    }

    /** 是否不支持 <a download> */
    function isRestrictedBrowser() {
        return isWechat() || isQQ();
    }

    /** QRCode库是否可用 */
    function isQRCodeAvailable() {
        return typeof QRCode !== 'undefined';
    }

    // ==================== URL 工具 ====================

    function getGameUrl(gameId, mode, shopId) {
        mode = mode || '';
        var shopParam = shopId ? '&shop=' + encodeURIComponent(shopId) : '';
        if (mode === 'setup') return SITE_URL + '/#/chat?id=' + gameId + '&mode=setup' + shopParam;
        if (mode === 'quick') return SITE_URL + '/#/chat?id=' + gameId + '&mode=quick' + shopParam;
        return SITE_URL + '/#/chat?id=' + gameId + shopParam;
    }

    // ==================== Canvas 绘制 ====================

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

    // ==================== 二维码生成（核心） ====================

    /**
     * 使用 QRCode.js 生成二维码 canvas
     * @param {string} text - 二维码内容
     * @param {number} size - 尺寸（px）
     * @param {number} dpr - 设备像素比（高清输出用）
     * @returns {Promise<{canvas: HTMLCanvasElement, dataUrl: string}>}
     */
    function generateQRCode(text, size, dpr) {
        size = size || QR_SIZE;
        dpr = dpr || 1;

        return new Promise(function(resolve, reject) {
            if (!isQRCodeAvailable()) {
                // 库未加载，使用在线API兜底
                fallbackOnlineQR(text, size * dpr).then(resolve, reject);
                return;
            }

            var tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            document.body.appendChild(tempDiv);

            try {
                var qrCode = new QRCode(tempDiv, {
                    text: text,
                    width: size * dpr,
                    height: size * dpr,
                    colorDark: '#2D2A26',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // 等待渲染
                setTimeout(function() {
                    try {
                        var qrCanvas = tempDiv.querySelector('canvas');
                        var qrImg = tempDiv.querySelector('img');

                        if (qrCanvas) {
                            var resultCanvas = document.createElement('canvas');
                            resultCanvas.width = size * dpr;
                            resultCanvas.height = size * dpr;
                            var resultCtx = resultCanvas.getContext('2d');
                            resultCtx.drawImage(qrCanvas, 0, 0, size * dpr, size * dpr);

                            var dataUrl = resultCanvas.toDataURL('image/png');
                            document.body.removeChild(tempDiv);
                            resolve({ canvas: resultCanvas, dataUrl: dataUrl });
                        } else if (qrImg && qrImg.src) {
                            var img = new Image();
                            img.onload = function() {
                                var c = document.createElement('canvas');
                                c.width = size * dpr;
                                c.height = size * dpr;
                                var ctx = c.getContext('2d');
                                ctx.drawImage(img, 0, 0, size * dpr, size * dpr);
                                var dataUrl = c.toDataURL('image/png');
                                document.body.removeChild(tempDiv);
                                resolve({ canvas: c, dataUrl: dataUrl });
                            };
                            img.onerror = function() {
                                document.body.removeChild(tempDiv);
                                fallbackOnlineQR(text, size * dpr).then(resolve, reject);
                            };
                            img.src = qrImg.src;
                        } else {
                            document.body.removeChild(tempDiv);
                            fallbackOnlineQR(text, size * dpr).then(resolve, reject);
                        }
                    } catch (e) {
                        safeRemove(tempDiv);
                        fallbackOnlineQR(text, size * dpr).then(resolve, reject);
                    }
                }, 400);
            } catch (e) {
                safeRemove(tempDiv);
                fallbackOnlineQR(text, size * dpr).then(resolve, reject);
            }
        });
    }

    /** 在线API兜底生成二维码 */
    function fallbackOnlineQR(text, size) {
        return new Promise(function(resolve, reject) {
            var url = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size +
                '&data=' + encodeURIComponent(text) + '&color=2D2A26&bgcolor=FFFFFF';
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                var c = document.createElement('canvas');
                c.width = size;
                c.height = size;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                try {
                    var dataUrl = c.toDataURL('image/png');
                    resolve({ canvas: c, dataUrl: dataUrl });
                } catch (e) {
                    // toDataURL可能也失败，返回canvas
                    resolve({ canvas: c, dataUrl: img.src });
                }
            };
            img.onerror = function() {
                reject(new Error('在线二维码API也失败了'));
            };
            img.src = url;
        });
    }

    function safeRemove(el) {
        try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch (e) { /* 忽略 */ }
    }

    // ==================== 卡片绘制 ====================

    /**
     * 绘制通用二维码卡片到 Canvas
     * @param {HTMLCanvasElement} canvas - 目标画布
     * @param {string} qrUrl - 二维码内容URL
     * @param {object} opts - { title, subtitle, urlText, titleSize, qrSize }
     * @returns {Promise<HTMLCanvasElement>}
     */
    function drawQRCard(canvas, qrUrl, opts) {
        opts = opts || {};
        var title = opts.title || '桌游AI教练';
        var subtitle = opts.subtitle || '扫码开始学习桌游规则';
        var urlText = opts.urlText || SITE_URL.replace('https://', '');
        var titleSize = opts.titleSize || 16;
        var qrSize = opts.qrSize || QR_SIZE;

        var dpr = window.devicePixelRatio || 1;
        // 微信中降低dpr避免canvas过大
        if (isRestrictedBrowser() && dpr > 2) dpr = 2;

        var W = CARD_W * dpr;
        var H = CARD_H * dpr;
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = CARD_W + 'px';
        canvas.style.height = CARD_H + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 绘制白色背景圆角卡片
        drawCardBackground(ctx);

        // 先绘制文字（即使二维码失败也能看到）
        drawCardText(ctx, title, subtitle, urlText, titleSize);

        // 异步生成二维码并绘制到卡片上
        var qrX = (CARD_W - qrSize) / 2;
        var qrY = QR_Y;

        return generateQRCode(qrUrl, qrSize, dpr).then(function(result) {
            // 将二维码绘制到卡片上
            ctx.drawImage(result.canvas, qrX, qrY, qrSize, qrSize);

            // 存储dataUrl到canvas上供后续使用
            canvas._qrDataUrl = result.dataUrl;
            return canvas;
        }).catch(function(e) {
            console.error('二维码绘制失败:', e);
            // 即使二维码失败也返回canvas（至少有文字和背景）
            drawErrorPlaceholder(ctx, qrX, qrY, qrSize);
            return canvas;
        });
    }

    function drawCardBackground(ctx) {
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, 0, 0, CARD_W, CARD_H, 16);
        ctx.fill();

        ctx.strokeStyle = '#E5E0D8';
        ctx.lineWidth = 1;
        roundRect(ctx, 0.5, 0.5, CARD_W - 1, CARD_H - 1, 16);
        ctx.stroke();
    }

    function drawCardText(ctx, title, subtitle, urlText, titleSize) {
        ctx.fillStyle = '#2D2A26';
        ctx.font = 'bold ' + titleSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, CARD_W / 2, CARD_H - 100);

        ctx.fillStyle = '#8C8578';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, CARD_W / 2, CARD_H - 78);

        ctx.fillStyle = '#B5AFA6';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(urlText, CARD_W / 2, CARD_H - 58);
    }

    function drawErrorPlaceholder(ctx, x, y, size) {
        ctx.fillStyle = '#F0EDE6';
        roundRect(ctx, x, y, size, size, 12);
        ctx.fill();

        ctx.fillStyle = '#B5AFA6';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('二维码生成失败', x + size / 2, y + size / 2 - 5);
        ctx.fillText('请检查网络重试', x + size / 2, y + size / 2 + 15);
    }

    // ==================== 公开 API：生成卡片 ====================

    function generateSiteQRCard() {
        var canvas = document.createElement('canvas');
        return drawQRCard(canvas, SITE_URL, {
            title: '桌游AI教练',
            subtitle: '扫码开始学习桌游规则',
            urlText: 'boardgame-ai.pages.dev'
        });
    }

    function generateGameQRCard(gameId, gameName, mode, shopId) {
        mode = mode || 'rules';
        var modeNames = { setup: '摆盘引导', rules: '规则教学', quick: '规则速查' };
        var modeName = modeNames[mode] || '规则教学';
        var url = getGameUrl(gameId, mode, shopId);

        var canvas = document.createElement('canvas');
        return drawQRCard(canvas, url, {
            title: '扫码学习',
            subtitle: gameName + ' \u00b7 ' + modeName,
            urlText: 'boardgame-ai.pages.dev'
        });
    }

    // ==================== 下载/保存（兼容微信/QQ） ====================

    /**
     * 保存二维码图片（统一入口，自动判断浏览器环境）
     * 微信/QQ：打开新窗口展示图片，提示用户长按保存
     * 普通浏览器：触发下载
     */
    function saveQRImage(canvas, filename) {
        filename = filename || '二维码.png';

        if (isRestrictedBrowser()) {
            // 微信/QQ：展示大图供长按保存
            showImageForLongPress(canvas, filename);
        } else {
            // 普通浏览器：直接下载
            downloadByLink(canvas, filename);
        }
    }

    /** 通过 <a download> 下载（普通浏览器） */
    function downloadByLink(canvas, filename) {
        try {
            var dataUrl = canvas.toDataURL('image/png');
            var link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('下载失败:', e);
            // 降级：尝试展示图片
            showImageForLongPress(canvas, filename);
        }
    }

    /** 微信/QQ 中打开新窗口展示大图，供用户长按保存 */
    function showImageForLongPress(canvas, filename) {
        try {
            var dataUrl = canvas.toDataURL('image/png');
            var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
                '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=3.0,user-scalable=yes">' +
                '<title>' + filename + '</title>' +
                '<style>*{margin:0;padding:0;}body{background:#F5F5F5;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;box-sizing:border-box;}' +
                'img{max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.1);}' +
                '.tip{color:#666;font-size:14px;margin-top:16px;text-align:center;line-height:1.6;}</style></head>' +
                '<body><img src="' + dataUrl + '" alt="二维码">' +
                '<p class="tip">👆 长按上方图片<br>选择「保存图片」即可保存二维码</p>' +
                '<p style="color:#999;font-size:12px;margin-top:8px;">桌游AI教练 · boardgame-ai.pages.dev</p></body></html>';

            var newWin = window.open('');
            if (newWin) {
                newWin.document.write(html);
                newWin.document.close();
            } else {
                // 弹窗被拦截，直接在页面上展示
                showImageOverlay(dataUrl, filename);
            }
        } catch (e) {
            console.error('展示图片失败:', e);
            alert('保存失败，请尝试截图保存');
        }
    }

    /** 页面内弹窗展示大图（兜底方案） */
    function showImageOverlay(dataUrl, filename) {
        // 移除已有overlay
        var existing = document.getElementById('qr-save-overlay');
        if (existing) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.id = 'qr-save-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        overlay.onclick = function() { document.body.removeChild(overlay); };

        var img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'max-width:90%;max-height:70%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

        var tip = document.createElement('div');
        tip.style.cssText = 'color:#fff;font-size:15px;margin-top:20px;text-align:center;line-height:1.8;';
        tip.innerHTML = '👆 长按图片选择「保存图片」<br><span style="font-size:12px;opacity:0.7;">点击空白处关闭</span>';

        overlay.appendChild(img);
        overlay.appendChild(tip);
        document.body.appendChild(overlay);
    }

    /** 旧接口兼容 */
    function downloadCanvas(canvas, filename) {
        saveQRImage(canvas, filename);
    }

    // ==================== 批量下载 ====================

    async function downloadAllQRZip(games, shopId) {
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
                await drawQRCard(canvas, getGameUrl(game.id, '', shopId), {
                    title: '桌游AI教练',
                    subtitle: gameName,
                    urlText: 'boardgame-ai.pages.dev',
                    titleSize: 14
                });

                var dataUrl;
                try {
                    dataUrl = canvas.toDataURL('image/png');
                } catch (e) {
                    dataUrl = canvas._qrDataUrl || '';
                }

                if (dataUrl && dataUrl.indexOf('base64,') > -1) {
                    var base64 = dataUrl.split(',')[1];
                    zip.file(gameName + '-二维码.png', base64, { base64: true });
                }
            } catch (e) {
                console.error('生成二维码失败:', gameName, e);
            }

            if (progressEl) {
                progressEl.textContent = '正在生成二维码... ' + (i + 1) + '/' + total;
            }
        }

        if (progressEl) {
            progressEl.textContent = '正在打包下载...';
        }

        try {
            var blob = await zip.generateAsync({ type: 'blob' });

            if (isRestrictedBrowser()) {
                // 微信中Blob下载也受限，提示用户
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = '桌游AI教练-全部二维码.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

                if (progressEl) {
                    progressEl.style.display = 'none';
                }
            } else {
                saveAs(blob, '桌游AI教练-全部二维码.zip');
                if (progressEl) {
                    progressEl.style.display = 'none';
                }
            }
        } catch (e) {
            console.error('打包失败:', e);
            if (progressEl) {
                progressEl.style.display = 'none';
            }
            alert('打包下载失败: ' + (e.message || '未知错误'));
        }
    }

    // ==================== 批量分页预览 ====================

    function renderBatchQRGrid(games, page, perPage, shopId) {
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
            var url = getGameUrl(game.id, '', shopId);
            var safeName = escapeHtml(gameName).replace(/'/g, "\\'");

            html += '<div class="batch-qr-item" id="batch-qr-item-' + i + '" style="background:#FFFFFF;border:1px solid #E5E0D8;border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;margin-bottom:12px;">' +
                '<div class="batch-qr-img" id="batch-qr-img-' + i + '" style="width:80px;height:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#F0EDE6;border-radius:8px;"></div>' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:4px;">' + escapeHtml(gameName) + '</div>' +
                '<div style="font-size:12px;color:#8C8578;">👥 ' + players + '  ⏱ ' + duration + '</div>' +
                '<div style="font-size:11px;color:#B5AFA6;margin-top:2px;word-break:break-all;">' + escapeHtml(url) + '</div>' +
                '</div>' +
                '<button onclick="QRUtils.downloadSingleQR(\'' + game.id + '\',\'' + safeName + '\')" style="flex-shrink:0;padding:8px 12px;background:#C4864B;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;">保存</button>' +
                '</div>';
        }

        var pagerHtml = '';
        if (totalPages > 1) {
            pagerHtml = '<div style="display:flex;justify-content:center;align-items:center;gap:12px;padding:12px 0;">' +
                '<button onclick="profilePage.batchQRPrevPage()" style="padding:8px 16px;background:#F0EDE6;color:#2D2A26;border:1px solid #E5E0D8;border-radius:8px;cursor:pointer;' + (page === 0 ? 'opacity:0.4;pointer-events:none;' : '') + '">上一页</button>' +
                '<span style="color:#2D2A26;font-size:14px;">' + (page + 1) + ' / ' + totalPages + '</span>' +
                '<button onclick="profilePage.batchQRNextPage()" style="padding:8px 16px;background:#F0EDE6;color:#2D2A26;border:1px solid #E5E0D8;border-radius:8px;cursor:pointer;' + (page >= totalPages - 1 ? 'opacity:0.4;pointer-events:none;' : '') + '">下一页</button>' +
                '</div>';
        }

        var tipText = isRestrictedBrowser() ?
            '共 ' + total + ' 个游戏（微信中请逐页截图，或点击"下载全部"打包）' :
            '共 ' + total + ' 个游戏（每页' + perPage + '个，可截图或点击"下载全部"打包ZIP）';

        return '<div class="batch-qr-grid" style="padding:16px;">' +
            '<div style="color:#8C8578;font-size:13px;margin-bottom:12px;">' + tipText + '</div>' +
            html +
            pagerHtml +
            '</div>';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ==================== 公开API ====================
    var api = {
        SITE_URL: SITE_URL,
        CARD_W: CARD_W,
        CARD_H: CARD_H,
        getGameUrl: getGameUrl,
        drawQRCard: drawQRCard,
        generateQRCode: generateQRCode,
        generateSiteQRCard: generateSiteQRCard,
        generateGameQRCard: generateGameQRCard,
        downloadCanvas: downloadCanvas,
        saveQRImage: saveQRImage,
        downloadAllQRZip: downloadAllQRZip,
        renderBatchQRGrid: renderBatchQRGrid,
        escapeHtml: escapeHtml,
        isWechat: isWechat,
        isQQ: isQQ,
        isRestrictedBrowser: isRestrictedBrowser,
        isQRCodeAvailable: isQRCodeAvailable,
        fallbackOnlineQR: fallbackOnlineQR
    };

    return api;
})();

// 单独下载单个游戏二维码（从 window._shopInfo 或 sessionStorage 获取 shopId）
QRUtils.downloadSingleQR = async function(gameId, gameName) {
    try {
        var shopId = (window._shopInfo && window._shopInfo.id) || sessionStorage.getItem('shopId') || '';
        var games = window.allGames || [];
        var game = null;
        for (var i = 0; i < games.length; i++) {
            if (String(games[i].id) === String(gameId)) { game = games[i]; break; }
        }
        if (!game) { game = { id: gameId, name: gameName }; }

        var canvas = document.createElement('canvas');
        await QRUtils.drawQRCard(canvas, QRUtils.getGameUrl(game.id, '', shopId), {
            title: '扫码学习',
            subtitle: (game.name || gameName) + ' · 规则速查',
            urlText: 'boardgame-ai.pages.dev'
        });
        QRUtils.saveQRImage(canvas, (game.name || gameName) + '-二维码.png');
    } catch (e) {
        console.error('下载失败:', e);
        alert('下载失败: ' + e.message);
    }
};

// 挂载到全局
window.QRUtils = QRUtils;
window.qrUtils = QRUtils;

console.log('[qrcode-utils.js] 加载完成，微信环境：' + QRUtils.isWechat() + '，QQ环境：' + QRUtils.isQQ());
