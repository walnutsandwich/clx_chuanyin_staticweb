// fetchMessages.js

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch data: 请刷新', error);
        throw error + "请刷新";
    }
}

document.addEventListener('DOMContentLoaded', async function () {

    var channelSelector = document.getElementById('channelSelector');
    channelSelector.value = getCurrentChannelFromUrl(); // 设置当前选中的频道

    var currentPage = 1;
    localStorage.setItem('currentPage', currentPage);
    var pageInput = document.getElementById('pageInput');
    pageInput.value = currentPage; // 设置输入框的值
    // 检查是否通过刷新进入页面

    // 改变频道时触发
    channelSelector.onchange = function () {
        console.log(channelSelector.value)
        var selectedChannel = channelSelector.value;
        window.location.href = selectedChannel + '.html'; // 跳转到对应的频道页面
    }

    var getLatestButton = document.getElementById('getLatestButton');
    getLatestButton.onclick = function () {
        jumpToPage(1); // 直接调用跳转到第一页
    };

    // 从URL中获取频道参数
    function getCurrentChannelFromUrl() {
        var urlParams = new URL(window.location.href);
        var pathname = urlParams.pathname.replace('/', '');
        console.log(pathname)
        if (pathname) {
            // 提取路径中的频道名称
            var channelName = pathname.replace(/\.html$/, ''); // 去掉 ".html" 和 "/"
            console.log('Extracted Channel Name:', channelName);
            return channelName;
        } else {
            console.log('Pathname is empty or undefined.');
            return "index"
        }
    }

    // 初始化页面时设置当前页码
    var pageLinks = document.querySelectorAll('.pagination .gr-button');
    pageLinks.forEach(function (link) {
        if (link.textContent === '上一页') {
            link.onclick = function (event) {
                previousPage();
            };
        } else if (link.textContent === '下一页') {
            link.onclick = function (event) {
                nextPage();
            };
        }
    });

    let pageDataCache = {}; // 缓存每页的数据
    let lastFetchTime = {}; // 记录每页的最后请求时间

    // 更新按钮点击事件
    var updateButton = [...document.querySelectorAll('.gr-button')].find(button => button.textContent.includes('获取最新消息'));
    if (updateButton) {
        updateButton.onclick = function () {
            console.log('Update button clicked.');
            jumpToPage(1); // 直接调用跳转到第一页
        };
    }

    // 跳转按钮点击事件
    var jumpButton = [...document.querySelectorAll('.gr-button')].find(button => button.textContent.includes('跳转'));
    if (jumpButton) {
        jumpButton.onclick = function () {
            console.log('Jump button clicked.');
            jumpToPage(); // 默认情况下从页码框获取页码
        };
    }

    const messagesContainer = document.getElementById('messages-container');
    const statusText = document.getElementById('status-text');
    const statusContainer = document.getElementById('status');
    const apiUrl = document.getElementById('api-url').value;
    async function fetchDataMessages(page, channel) {
        console.log('Fetching data for page:', page, 'and channel:', channel);
        try {
            const data = await fetchData(`${apiUrl}?page=${page}`);
            console.log('Fetched data:', data); // 打印数据
            const processedData = processData(data); // 处理数据
            lastFetchTime[`${channel}_${page}`] = Date.now(); // 请求成功后设置请求时间
            pageDataCache[`${channel}_${page}`] = processedData; // 存储处理后的数据
            displayLastFetchData(processedData, channel);
        } catch (error) {
            console.error('Fetch error:', error);
            messagesContainer.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    }

    function processData(data) {
        const now = new Date();
        const timeDiff = now.getTime() - data.s * 1000;
        let status = '';

        if (timeDiff < 1000 * 60) {
            status = '正在更新';
            statusContainer.classList.add('status-updating');
            statusContainer.classList.remove('status-not-updating');
        } else {
            status = '未在更新';
            statusContainer.classList.add('status-not-updating');
            statusContainer.classList.remove('status-updating');
        }

        return { ...data, status }; // 返回带有状态的新对象
    }

    function displayLastFetchData(data) {
        if (data) {
            statusText.textContent = data.status; // 设置状态文本
            messagesContainer.innerHTML = '';

            data.m.forEach(message => {
                const timestamp = message.t.toString().slice(0, -1);
                const messageDate = new Date(parseInt(timestamp) * 1000); // 转换为 JavaScript Date 对象
                const avatarNumber = Math.floor((message.h + 1) / 2); // 计算头像编号
                const avatarSrc = `heads/${avatarNumber}.png`; // 获取头像路径
                const messageElement = `
                    <div class="message">
                        <img src="${avatarSrc}" alt="Avatar" class="message-avatar">
                        <div class="message-info">
                            <div class="message-header">
                                <span class="message-author">${message.n}</span>
                                <span class="message-date-time">${messageDate.toLocaleString()}</span>
                            </div>
                            <div class="message-content">${message.m}</div>
                        </div>
                    </div>
                `;
                messagesContainer.insertAdjacentHTML('beforeend', messageElement);
            });
        }
    }

    // 页面加载后初始化数据
    fetchDataMessages(currentPage).catch(error => {
        console.error('Initial fetch error:', error);
        messagesContainer.innerHTML = `<p>Error: ${error.message}</p>`;
    });

    // 定义函数
    function jumpToPage(page) {
        console.log('Jump to page:', page);
        page = page || parseInt(document.getElementById('pageInput').value);
        if (!isNaN(page) && page > 0) {
            if (page === 1) {
                if (pageDataCache.hasOwnProperty(page) &&
                    lastFetchTime.hasOwnProperty(page) &&
                    Date.now() - lastFetchTime[page] < 3000) {
                    console.log('Reusing cached data for page:', page);
                    displayLastFetchData(pageDataCache[page]);
                } else {
                    fetchDataMessages(page);
                }
            } else {
                if (pageDataCache.hasOwnProperty(page) &&
                    lastFetchTime.hasOwnProperty(page) &&
                    Date.now() - lastFetchTime[page] < 20000) {
                    console.log('Reusing cached data for page:', page);
                    displayLastFetchData(pageDataCache[page]);
                } else {
                    fetchDataMessages(page);
                }
            }
            saveCurrentPage(page);
            updatePageInput(page); // 更新页码输入框
        } else {
            alert('请输入有效的页码');
        }
    }

    function saveCurrentPage(page) {
        localStorage.setItem('currentPage', page);
    }

    function getCurrentPage() {
        var urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('page') || localStorage.getItem('currentPage') || 1);
    }

    function nextPage() {
        console.log('Next page clicked.');
        var currentPage = getCurrentPage();
        var nextPage = currentPage + 1;
        jumpToPage(nextPage);
        scrollToTop();
    }

    function previousPage() {
        console.log('Previous page clicked.');
        var currentPage = getCurrentPage();
        var prevPage = currentPage - 1;
        if (prevPage > 0) {
            jumpToPage(prevPage);
            scrollToEnd();
        } else {
            alert('已经是第一页了！');
        }
    }

    function updatePageInput(page) {
        var pageInput = document.getElementById('pageInput');
        pageInput.value = page.toString();
    }

    function scrollToTop() {
        var container = document.getElementById('mainContainer');
        container.scrollIntoView();
    }

    function scrollToEnd() {
        var container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }

    // 显示二维码模态框
    document.getElementById('support-author').onclick = function (event) {
        event.preventDefault();
        document.getElementById('qr-code-modal').style.display = 'block';
    };

    // 关闭二维码模态框
    function closeQRCodeModal() {
        document.getElementById('qr-code-modal').style.display = 'none';
    }

    // 确保关闭按钮也能关闭模态框
    document.querySelector('.close-btn').addEventListener('click', closeQRCodeModal);
});