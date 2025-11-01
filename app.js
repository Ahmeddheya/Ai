/**
 * Professional Scalping Bot v3.2 - Main Application Controller
 */

let tradingEngine;
let priceChart;
let isTrading = false;
let updateInterval;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Scalping Bot v3.2 initializing...');
    
    // Initialize trading engine
    tradingEngine = new TradingEngine(10000);
    
    // Initialize UI
    initializeChart();
    setupEventListeners();
    
    // Start data updates
    startDataUpdates();
    
    // Log initialization
    addLog('System initialized successfully');
    updateBotStatus('Ready', 'ready');
    
    // Run initial UI update
    updateUI();
    
    console.log('✅ Bot ready for trading');
});

function setupEventListeners() {
    // Start/Stop trading button
    const toggleBtn = document.getElementById('toggleBot');
    toggleBtn.addEventListener('click', () => {
        if (isTrading) {
            stopTrading();
        } else {
            startTrading();
        }
    });
    
    // Run tests button
    const runTestsBtn = document.getElementById('runTestsBtn');
    runTestsBtn.addEventListener('click', async () => {
        runTestsBtn.disabled = true;
        runTestsBtn.textContent = 'Running...';
        await runTests();
        runTestsBtn.disabled = false;
        runTestsBtn.textContent = 'Run Tests';
    });
    
    // Market card clicks (change chart symbol)
    document.querySelectorAll('.market-card').forEach(card => {
        card.addEventListener('click', () => {
            const symbol = card.dataset.symbol;
            updateChart(symbol);
            document.getElementById('chartSymbol').textContent = `${symbol}/USDT`;
        });
    });
    
    // Timeframe selector
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function startTrading() {
    isTrading = true;
    tradingEngine.start();
    document.getElementById('toggleBot').textContent = 'Stop Trading';
    document.getElementById('toggleBot').classList.add('btn-danger');
    document.getElementById('toggleBot').classList.remove('btn-primary');
    updateBotStatus('Trading Active', 'active');
    addLog('Trading started');
    showToast('Trading Started', 'Bot is now analyzing markets', 'success');
}

function stopTrading() {
    isTrading = false;
    tradingEngine.stop();
    document.getElementById('toggleBot').textContent = 'Start Trading';
    document.getElementById('toggleBot').classList.remove('btn-danger');
    document.getElementById('toggleBot').classList.add('btn-primary');
    updateBotStatus('Trading Stopped', 'stopped');
    addLog('Trading stopped by user');
    showToast('Trading Stopped', 'Bot has stopped analyzing', 'error');
}

function startDataUpdates() {
    // Update prices every 3 seconds
    updateInterval = setInterval(() => {
        tradingEngine.dataEngine.updatePrices();
        tradingEngine.updatePositions();
        tradingEngine.updateMarketSentiment();
        updateUI();
        
        // Run analysis cycle if trading
        if (isTrading) {
            runTradingCycle();
        }
    }, 3000);
}

async function runTradingCycle() {
    const result = await tradingEngine.runAnalysisCycle();
    
    if (result) {
        if (result.allPassed) {
            addLog(`Position opened: ${result.position.symbol} ${result.position.direction} - Pattern: ${result.position.pattern}`);
            addLog(`Checklist score: ${result.position.checklistScore}/23 - Trade approved`);
            showToast(
                'Position Opened',
                `${result.position.symbol} ${result.position.direction} at $${result.position.entryPrice.toFixed(2)}`,
                'success'
            );
            updatePositionsUI();
        } else if (result.level) {
            if (result.level === 'checklist') {
                addLog(`Checklist validation failed: ${result.checklistScore}/23 points`);
                updateChecklistDisplay(tradingEngine.checklist || { checks: [], score: result.checklistScore || 0 });
            } else {
                addLog(`Analysis failed at Level ${result.level}: ${result.reason}`);
            }
        }
    }
}

function updateUI() {
    updateMarketCards();
    updateAccountBalance();
    updateStatistics();
    updateRiskGauges();
    updateSentiment();
    updateAnalysisLevels();
    updatePositionsUI();
}

function updateMarketCards() {
    tradingEngine.dataEngine.assets.forEach(asset => {
        const indicators = tradingEngine.dataEngine.getIndicators(asset.symbol);
        const history = tradingEngine.dataEngine.getPriceHistory(asset.symbol, 2);
        
        // Price
        document.getElementById(`${asset.symbol.toLowerCase()}Price`).textContent = 
            `$${asset.price.toFixed(2)}`;
        
        // Change percentage
        if (history.length >= 2) {
            const change = ((history[1].close - history[0].close) / history[0].close) * 100;
            const changeEl = document.getElementById(`${asset.symbol.toLowerCase()}Change`);
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeEl.className = change >= 0 ? 'change positive' : 'change negative';
        }
        
        // RSI
        document.getElementById(`${asset.symbol.toLowerCase()}Rsi`).textContent = 
            indicators.rsi ? indicators.rsi.toFixed(1) : '--';
        
        // Volume
        document.getElementById(`${asset.symbol.toLowerCase()}Vol`).textContent = 
            indicators.currentVolume ? (indicators.currentVolume / 1000000).toFixed(2) + 'M' : '--';
    });
}

function updateAccountBalance() {
    document.getElementById('accountBalance').textContent = 
        `$${tradingEngine.riskManager.currentBalance.toFixed(2)}`;
}

function updateStatistics() {
    const stats = tradingEngine.getStatistics();
    
    document.getElementById('dailyRoi').textContent = `${stats.dailyRoi}%`;
    document.getElementById('monthlyRoi').textContent = `${stats.monthlyRoi}%`;
    document.getElementById('winRate').textContent = `${stats.winRate}%`;
    document.getElementById('profitFactor').textContent = stats.profitFactor;
}

function updateRiskGauges() {
    const dailyDD = tradingEngine.riskManager.getDailyDrawdown();
    const weeklyDD = tradingEngine.riskManager.getWeeklyDrawdown();
    const monthlyDD = tradingEngine.riskManager.getMonthlyDrawdown();
    
    // Daily
    const dailyPercent = Math.abs(dailyDD / 3.0) * 100;
    document.getElementById('dailyDrawdownBar').style.width = `${Math.min(dailyPercent, 100)}%`;
    document.getElementById('dailyDrawdown').textContent = `${dailyDD.toFixed(2)}% / -3.00%`;
    
    // Weekly
    const weeklyPercent = Math.abs(weeklyDD / 8.0) * 100;
    document.getElementById('weeklyDrawdownBar').style.width = `${Math.min(weeklyPercent, 100)}%`;
    document.getElementById('weeklyDrawdown').textContent = `${weeklyDD.toFixed(2)}% / -8.00%`;
    
    // Monthly
    const monthlyPercent = Math.abs(monthlyDD / 15.0) * 100;
    document.getElementById('monthlyDrawdownBar').style.width = `${Math.min(monthlyPercent, 100)}%`;
    document.getElementById('monthlyDrawdown').textContent = `${monthlyDD.toFixed(2)}% / -15.00%`;
}

function updateSentiment() {
    const fg = Math.round(tradingEngine.fearGreedIndex);
    document.getElementById('fearGreedValue').textContent = fg;
    
    let label = 'Neutral';
    if (fg < 25) label = 'Extreme Fear';
    else if (fg < 45) label = 'Fear';
    else if (fg < 55) label = 'Neutral';
    else if (fg < 75) label = 'Greed';
    else label = 'Extreme Greed';
    
    document.getElementById('fearGreedLabel').textContent = label;
    
    // Momentum
    const momentum = fg > 60 ? 'Bullish' : fg < 40 ? 'Bearish' : 'Neutral';
    document.getElementById('momentumBadge').textContent = momentum;
    
    // Volatility
    const avgVolatility = tradingEngine.dataEngine.assets.reduce((sum, asset) => {
        const indicators = tradingEngine.dataEngine.getIndicators(asset.symbol);
        return sum + (indicators.volatility || 0);
    }, 0) / 3;
    
    const volatility = avgVolatility > 2 ? 'High' : avgVolatility < 1 ? 'Low' : 'Normal';
    document.getElementById('volatilityBadge').textContent = volatility;
}

function updateAnalysisLevels() {
    ['level1', 'level2', 'level3', 'level4'].forEach((level, index) => {
        const state = tradingEngine.analysisState[level];
        const el = document.getElementById(level);
        
        el.classList.remove('active');
        
        const statusEl = el.querySelector('.level-status');
        if (state === 'analyzing') {
            el.classList.add('active');
            statusEl.textContent = '⚡';
        } else if (state === 'passed') {
            statusEl.textContent = '✅';
        } else if (state === 'failed') {
            statusEl.textContent = '❌';
        } else {
            statusEl.textContent = '⏳';
        }
    });
}

function updateChecklistDisplay(checklistData) {
    const container = document.getElementById('checklistContainer');
    const scoreEl = document.getElementById('checklistScore');
    
    if (!checklistData || !checklistData.checks || checklistData.checks.length === 0) {
        container.innerHTML = '<div class="checklist-placeholder">Waiting for analysis...</div>';
        scoreEl.textContent = '0/23';
        return;
    }
    
    scoreEl.textContent = `${checklistData.score}/23`;
    
    const grid = document.createElement('div');
    grid.className = 'checklist-grid';
    
    checklistData.checks.forEach(check => {
        const item = document.createElement('div');
        item.className = `checklist-item ${check.passed ? 'passed' : 'failed'}`;
        item.innerHTML = `
            <span class="checklist-icon">${check.passed ? '✅' : '❌'}</span>
            <span class="checklist-text">${check.name}</span>
        `;
        grid.appendChild(item);
    });
    
    container.innerHTML = '';
    container.appendChild(grid);
}

function updatePositionsUI() {
    document.getElementById('positionCount').textContent = `${tradingEngine.positions.length}/2`;
    
    // Update Slot 1
    const slot1El = document.getElementById('slot1');
    if (tradingEngine.positions.length >= 1) {
        const pos = tradingEngine.positions[0];
        slot1El.innerHTML = createPositionHTML(pos);
    } else {
        slot1El.innerHTML = `
            <div class="position-empty">
                <span class="slot-label">Slot 1</span>
                <span class="slot-status">Empty</span>
            </div>
        `;
    }
    
    // Update Slot 2
    const slot2El = document.getElementById('slot2');
    if (tradingEngine.positions.length === 2) {
        const pos = tradingEngine.positions[1];
        slot2El.innerHTML = createPositionHTML(pos);
    } else if (tradingEngine.positions.length === 1 && tradingEngine.positions[0].tp1Hit) {
        slot2El.innerHTML = `
            <div class="position-empty">
                <span class="slot-label">Slot 2</span>
                <span class="slot-status">Ready (TP1 Hit)</span>
            </div>
        `;
    } else {
        slot2El.innerHTML = `
            <div class="position-empty">
                <span class="slot-label">Slot 2</span>
                <span class="slot-status">Locked</span>
            </div>
        `;
    }
}

function createPositionHTML(pos) {
    const asset = tradingEngine.dataEngine.getAsset(pos.symbol);
    const pnlClass = pos.pnl >= 0 ? 'profit' : 'loss';
    const pnlSign = pos.pnl >= 0 ? '+' : '';
    
    return `
        <div class="position-active">
            <div class="position-header">
                <span class="position-symbol">${pos.symbol}/USDT</span>
                <span class="position-direction ${pos.direction.toLowerCase()}">${pos.direction}</span>
            </div>
            <div class="position-info">
                <div class="position-info-item">
                    <span class="position-info-label">Entry:</span>
                    <span class="position-info-value">$${pos.entryPrice.toFixed(2)}</span>
                </div>
                <div class="position-info-item">
                    <span class="position-info-label">Current:</span>
                    <span class="position-info-value">$${asset.price.toFixed(2)}</span>
                </div>
                <div class="position-info-item">
                    <span class="position-info-label">TP1:</span>
                    <span class="position-info-value">${pos.tp1Hit ? '✅' : '$' + pos.tp1.toFixed(2)}</span>
                </div>
                <div class="position-info-item">
                    <span class="position-info-label">TP2:</span>
                    <span class="position-info-value">$${pos.tp2.toFixed(2)}</span>
                </div>
                <div class="position-info-item">
                    <span class="position-info-label">SL:</span>
                    <span class="position-info-value">$${pos.stopLoss.toFixed(2)}</span>
                </div>
                <div class="position-info-item">
                    <span class="position-info-label">Pattern:</span>
                    <span class="position-info-value" style="font-size: 10px">${pos.pattern.replace('_', ' ')}</span>
                </div>
            </div>
            <div class="position-pnl ${pnlClass}">${pnlSign}$${pos.pnl.toFixed(2)}</div>
            <div class="position-actions">
                <button class="btn btn-sm btn-secondary" onclick="manualClosePosition(${pos.slot - 1})">Close Position</button>
            </div>
        </div>
    `;
}

function manualClosePosition(slotIndex) {
    tradingEngine.manualClosePosition(slotIndex);
    addLog(`Position manually closed (Slot ${slotIndex + 1})`);
    showToast('Position Closed', 'Position manually closed by user', 'success');
    updatePositionsUI();
}

function initializeChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#777',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#777'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    updateChart('BTC');
}

function updateChart(symbol) {
    const history = tradingEngine.dataEngine.getPriceHistory(symbol, 50);
    
    priceChart.data.labels = history.map((candle, i) => {
        if (i % 5 === 0) {
            const date = new Date(candle.time);
            return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        return '';
    });
    
    priceChart.data.datasets[0].data = history.map(candle => candle.close);
    priceChart.data.datasets[0].label = `${symbol}/USDT Price`;
    priceChart.update('none');
}

function updateBotStatus(text, status) {
    document.querySelector('.status-text').textContent = text;
    const dot = document.querySelector('.status-dot');
    
    if (status === 'active') {
        dot.style.background = '#00ff88';
    } else if (status === 'stopped') {
        dot.style.background = '#ff4466';
    } else {
        dot.style.background = '#00d4ff';
    }
}

function addLog(message) {
    const logContainer = document.getElementById('logContainer');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-message">${message}</span>
    `;
    
    logContainer.insertBefore(logEntry, logContainer.firstChild);
    
    // Keep only last 20 entries
    while (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function showToast(title, message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 5000);
}

async function runTests() {
    console.log('🧪 Starting test suite...');
    addLog('Running comprehensive test suite...');
    
    try {
        const results = await window.testSuite.runAll();
        displayTestResults(results);
        
        if (results.failed === 0) {
            showToast('All Tests Passed!', `${results.passed}/${results.total} tests successful`, 'success');
            addLog(`✅ All ${results.total} tests passed successfully`);
        } else {
            showToast('Some Tests Failed', `${results.failed}/${results.total} tests failed`, 'error');
            addLog(`⚠️ ${results.failed} tests failed, ${results.passed} passed`);
        }
    } catch (error) {
        console.error('Test suite error:', error);
        showToast('Test Error', 'Failed to run test suite', 'error');
    }
}

function displayTestResults(results) {
    // Update summary
    document.getElementById('totalTests').textContent = results.total;
    document.getElementById('passedTests').textContent = results.passed;
    document.getElementById('failedTests').textContent = results.failed;
    
    // Display test details
    const testList = document.getElementById('testList');
    testList.innerHTML = '';
    
    results.details.forEach(test => {
        const testItem = document.createElement('div');
        testItem.className = `test-item ${test.status.toLowerCase()}`;
        
        const statusIcon = test.status === 'PASS' ? '✅' : '❌';
        
        testItem.innerHTML = `
            <div class="test-item-left">
                <span class="test-status-icon">${statusIcon}</span>
                <span class="test-name">${test.name}</span>
            </div>
            <div class="test-item-right">
                <span class="test-duration">${test.duration}ms</span>
            </div>
            ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
        `;
        
        testList.appendChild(testItem);
    });
}

// Auto-run tests on initialization (after 2 seconds)
setTimeout(() => {
    if (window.testSuite) {
        addLog('Auto-running test suite...');
        runTests();
    }
}, 2000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});