/**
 * 桌游AI教练 - 前端路由模块
 * 基于 Hash 的简单路由实现
 */

// 路由表配置
const routes = {
    'home': '/home',
    'detail': '/detail',
    'chat': '/chat',
    'search': '/search',
    'recommend': '/recommend',
    'guide': '/guide'
};

// 存储当前路由名称
let currentPage = 'home';

/**
 * 解析 URL 参数
 * @param {string} hash - hash 字符串
 * @returns {object} 包含路由名和参数对象
 */
function parseHash(hash) {
    const path = hash.slice(1) || '/home';
    const [routePath, queryString] = path.split('?');

    const params = {};
    if (queryString) {
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            params[key] = decodeURIComponent(value);
        });
    }

    return {
        route: routePath.slice(1), // 去掉前导 /
        params
    };
}

/**
 * 路由变化处理
 */
function handleRoute() {
    const { route, params } = parseHash(window.location.hash);
    currentPage = route || 'home';

    // 触发路由变化事件
    window.dispatchEvent(new CustomEvent('routechange', {
        detail: { page: currentPage, params, hash: window.location.hash }
    }));
}

/**
 * 获取当前路由信息（供外部使用）
 * @returns {{ route: string, params: object, hash: string }}
 */
function getCurrentRoute() {
    return parseHash(window.location.hash);
}

/**
 * 导航到指定路径
 * @param {string} path - 目标路径，如 '/home', '/detail?id=1'
 */
function navigate(path) {
    window.location.hash = path;
}

/**
 * 渲染页面（由 app.js 调用）
 * @param {string} name - 页面名称
 */
function renderPage(name) {
    // 触发页面渲染事件
    window.dispatchEvent(new CustomEvent('pagerender', {
        detail: { page: name }
    }));
}

/**
 * 初始化路由
 */
function initRouter() {
    // 监听 hash 变化
    window.addEventListener('hashchange', handleRoute);

    // 初始化路由
    if (!window.location.hash) {
        navigate('/home');
    } else {
        handleRoute();
    }
}

// ==================== 全局导出 ====================
// 传统 script 加载方式需要挂载到 window
window.parseHash = parseHash;
window.navigate = navigate;
window.getCurrentRoute = getCurrentRoute;
