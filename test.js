/**
 * Professional Scalping Bot v3.2 - Comprehensive Testing Suite
 * Tests all components: indicators, risk management, position management, and trading logic
 */

class TestSuite {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAll() {
        console.log('🧪 Starting Test Suite...');
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };

        for (const test of this.tests) {
            try {
                const startTime = performance.now();
                await test.testFn();
                const duration = performance.now() - startTime;
                
                this.results.passed++;
                this.results.details.push({
                    name: test.name,
                    status: 'PASS',
                    duration: duration.toFixed(2),
                    error: null
                });
                console.log(`✅ ${test.name} - PASSED (${duration.toFixed(2)}ms)`);
            } catch (error) {
                this.results.failed++;
                this.results.details.push({
                    name: test.name,
                    status: 'FAIL',
                    duration: 0,
                    error: error.message
                });
                console.error(`❌ ${test.name} - FAILED:`, error.message);
            }
            this.results.total++;
        }

        console.log(`\n📊 Test Results: ${this.results.passed}/${this.results.total} passed`);
        return this.results;
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(message || `Value ${value} not in range [${min}, ${max}]`);
        }
    }
}

// Initialize test suite
const testSuite = new TestSuite();

// ==================== INDICATOR TESTS ====================

testSuite.addTest('RSI Calculation Test', () => {
    const engine = new DataEngine();
    const indicators = engine.getIndicators('BTC');
    
    testSuite.assert(indicators.rsi !== undefined, 'RSI should be calculated');
    testSuite.assertRange(indicators.rsi, 0, 100, 'RSI should be between 0 and 100');
});

testSuite.addTest('Moving Average Calculation Test', () => {
    const engine = new DataEngine();
    const indicators = engine.getIndicators('BTC');
    
    testSuite.assert(indicators.ma9 > 0, 'MA9 should be positive');
    testSuite.assert(indicators.ma21 > 0, 'MA21 should be positive');
    testSuite.assert(Math.abs(indicators.ma9 - indicators.ma21) < 10000, 'MAs should be reasonably close');
});

testSuite.addTest('Volume Calculation Test', () => {
    const engine = new DataEngine();
    const indicators = engine.getIndicators('ETH');
    
    testSuite.assert(indicators.avgVolume > 0, 'Average volume should be positive');
    testSuite.assert(indicators.currentVolume > 0, 'Current volume should be positive');
});

testSuite.addTest('Volatility Calculation Test', () => {
    const engine = new DataEngine();
    const indicators = engine.getIndicators('SOL');
    
    testSuite.assert(indicators.volatility >= 0, 'Volatility should be non-negative');
    testSuite.assertRange(indicators.volatility, 0, 20, 'Volatility should be reasonable');
});

testSuite.addTest('Price History Generation Test', () => {
    const engine = new DataEngine();
    const history = engine.getPriceHistory('BTC', 50);
    
    testSuite.assertEqual(history.length, 50, 'Should return 50 candles');
    testSuite.assert(history[0].open > 0, 'Open price should be positive');
    testSuite.assert(history[0].high >= history[0].low, 'High should be >= Low');
    testSuite.assert(history[0].volume > 0, 'Volume should be positive');
});

// ==================== RISK MANAGEMENT TESTS ====================

testSuite.addTest('Initial Balance Test', () => {
    const riskManager = new RiskManager(10000);
    
    testSuite.assertEqual(riskManager.currentBalance, 10000, 'Initial balance should be 10000');
    testSuite.assertEqual(riskManager.initialBalance, 10000, 'Initial balance should match');
});

testSuite.addTest('Daily Loss Limit Test', () => {
    const riskManager = new RiskManager(10000);
    
    // Simulate loss
    riskManager.currentBalance = 9650; // -3.5% loss
    
    testSuite.assert(!riskManager.canTrade(), 'Should not allow trading after daily loss limit');
});

testSuite.addTest('Consecutive Loss Test', () => {
    const riskManager = new RiskManager(10000);
    
    // Record 3 consecutive losses
    riskManager.recordTrade(-50);
    riskManager.recordTrade(-50);
    riskManager.recordTrade(-50);
    
    testSuite.assert(!riskManager.canTrade(), 'Should not trade after 3 consecutive losses');
});

testSuite.addTest('Position Size Calculation Test', () => {
    const riskManager = new RiskManager(10000);
    const positionSize = riskManager.calculatePositionSize();
    
    testSuite.assertEqual(positionSize, 50, 'Position size should be 0.5% of balance');
});

testSuite.addTest('Drawdown Calculation Test', () => {
    const riskManager = new RiskManager(10000);
    riskManager.currentBalance = 9800;
    
    const dailyDD = riskManager.getDailyDrawdown();
    testSuite.assertEqual(dailyDD, -2, 'Daily drawdown should be -2%');
});

testSuite.addTest('Weekly Drawdown Position Reduction Test', () => {
    const riskManager = new RiskManager(10000);
    riskManager.weeklyStartBalance = 10000;
    riskManager.currentBalance = 9100; // -9% weekly loss
    
    const positionSize = riskManager.calculatePositionSize();
    testSuite.assert(positionSize < 50, 'Position size should be reduced after weekly drawdown');
});

// ==================== POSITION MANAGEMENT TESTS ====================

testSuite.addTest('Maximum Position Limit Test', () => {
    const engine = new TradingEngine(10000);
    engine.start();
    
    // Open 2 positions manually
    const asset1 = engine.dataEngine.getAsset('BTC');
    const asset2 = engine.dataEngine.getAsset('ETH');
    
    engine.openPosition(asset1, 'LONG', 'Test_Pattern');
    engine.openPosition(asset2, 'SHORT', 'Test_Pattern');
    
    testSuite.assertEqual(engine.positions.length, 2, 'Should have exactly 2 positions');
    
    const asset3 = engine.dataEngine.getAsset('SOL');
    const result = engine.selectAsset();
    
    testSuite.assert(result === null, 'Should not select asset when max positions reached');
});

testSuite.addTest('Position Opening Test', () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('BTC');
    
    const position = engine.openPosition(asset, 'LONG', 'Break_of_Block');
    
    testSuite.assert(position.id > 0, 'Position should have valid ID');
    testSuite.assertEqual(position.symbol, 'BTC', 'Position symbol should match');
    testSuite.assertEqual(position.direction, 'LONG', 'Position direction should be LONG');
    testSuite.assert(position.entryPrice > 0, 'Entry price should be positive');
    testSuite.assert(position.tp1 > position.entryPrice, 'TP1 should be above entry for LONG');
    testSuite.assert(position.stopLoss < position.entryPrice, 'SL should be below entry for LONG');
});

testSuite.addTest('Short Position Test', () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('ETH');
    
    const position = engine.openPosition(asset, 'SHORT', 'Liquidity_Sweep');
    
    testSuite.assertEqual(position.direction, 'SHORT', 'Position direction should be SHORT');
    testSuite.assert(position.tp1 < position.entryPrice, 'TP1 should be below entry for SHORT');
    testSuite.assert(position.stopLoss > position.entryPrice, 'SL should be above entry for SHORT');
});

testSuite.addTest('TP1 Hit Test', () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('BTC');
    
    const position = engine.openPosition(asset, 'LONG', 'Test_Pattern');
    
    // Simulate price reaching TP1
    asset.price = position.tp1 + 1;
    engine.updatePositions();
    
    testSuite.assert(position.tp1Hit, 'TP1 should be marked as hit');
    testSuite.assertEqual(position.stopLoss, position.entryPrice, 'SL should move to breakeven after TP1');
});

testSuite.addTest('TP2 Closing Test', () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('SOL');
    
    const position = engine.openPosition(asset, 'LONG', 'Test_Pattern');
    const initialPositionCount = engine.positions.length;
    
    // Simulate price reaching TP2
    asset.price = position.tp2 + 1;
    engine.updatePositions();
    
    testSuite.assert(engine.positions.length < initialPositionCount, 'Position should be closed at TP2');
    testSuite.assert(engine.closedTrades.length > 0, 'Trade should be recorded in history');
});

testSuite.addTest('Stop Loss Test', () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('BTC');
    
    const position = engine.openPosition(asset, 'LONG', 'Test_Pattern');
    const initialBalance = engine.riskManager.currentBalance;
    
    // Simulate price hitting stop loss
    asset.price = position.stopLoss - 1;
    engine.updatePositions();
    
    testSuite.assert(engine.positions.length === 0, 'Position should be closed at SL');
    testSuite.assert(engine.riskManager.currentBalance < initialBalance, 'Balance should decrease after loss');
});

// ==================== 4-LEVEL ANALYSIS TESTS ====================

testSuite.addTest('Level 1 Safety Gates - RSI Test', async () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('BTC');
    
    // Force extreme RSI
    engine.dataEngine.indicators['BTC'].rsi = 75;
    
    const result = await engine.level1SafetyGates(asset);
    testSuite.assert(!result.passed, 'Should fail with extreme RSI');
});

testSuite.addTest('Level 1 Safety Gates - Volume Test', async () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('ETH');
    
    // Force low volume
    engine.dataEngine.indicators['ETH'].currentVolume = engine.dataEngine.indicators['ETH'].avgVolume * 0.3;
    
    const result = await engine.level1SafetyGates(asset);
    testSuite.assert(!result.passed, 'Should fail with insufficient volume');
});

testSuite.addTest('Level 1 Safety Gates - Pass Test', async () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('SOL');
    
    // Set good conditions
    engine.dataEngine.indicators['SOL'].rsi = 50;
    engine.dataEngine.indicators['SOL'].currentVolume = engine.dataEngine.indicators['SOL'].avgVolume * 1.5;
    engine.riskManager.consecutiveLosses = 0;
    
    const result = await engine.level1SafetyGates(asset);
    testSuite.assert(result.passed, 'Should pass with good conditions');
});

testSuite.addTest('Level 2 Structural Analysis Test', async () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('BTC');
    
    const result = await engine.level2StructuralAnalysis(asset);
    
    if (result.passed) {
        testSuite.assert(result.direction === 'LONG' || result.direction === 'SHORT', 'Should have valid direction');
        testSuite.assert(result.pattern !== undefined, 'Should identify pattern');
    }
});

testSuite.addTest('Level 3 Risk Assessment Test', async () => {
    const engine = new TradingEngine(10000);
    const asset = engine.dataEngine.getAsset('ETH');
    
    const result = await engine.level3RiskAssessment(asset, 'LONG');
    
    if (result.passed) {
        testSuite.assert(result.positionSize > 0, 'Should calculate position size');
    }
});

testSuite.addTest('Level 4 Sentiment Test', async () => {
    const engine = new TradingEngine(10000);
    
    // Set neutral sentiment
    engine.fearGreedIndex = 50;
    const result = await engine.level4SentimentCheck();
    
    testSuite.assert(result.passed, 'Should pass with neutral sentiment');
});

testSuite.addTest('Level 4 Sentiment Extreme Test', async () => {
    const engine = new TradingEngine(10000);
    
    // Set extreme fear
    engine.fearGreedIndex = 10;
    const result = await engine.level4SentimentCheck();
    
    testSuite.assert(!result.passed, 'Should fail with extreme sentiment');
});

// ==================== STATISTICS TESTS ====================

testSuite.addTest('Statistics Calculation - No Trades Test', () => {
    const engine = new TradingEngine(10000);
    const stats = engine.getStatistics();
    
    testSuite.assertEqual(stats.totalTrades, 0, 'Should have 0 trades initially');
    testSuite.assertEqual(stats.winRate, '0', 'Win rate should be 0');
});

testSuite.addTest('Statistics Calculation - With Trades Test', () => {
    const engine = new TradingEngine(10000);
    
    // Simulate closed trades
    engine.closedTrades = [
        { finalPnl: 50, symbol: 'BTC' },
        { finalPnl: -30, symbol: 'ETH' },
        { finalPnl: 40, symbol: 'SOL' },
        { finalPnl: 60, symbol: 'BTC' }
    ];
    
    const stats = engine.getStatistics();
    
    testSuite.assertEqual(stats.totalTrades, 4, 'Should have 4 trades');
    testSuite.assertEqual(stats.winRate, '75.0', 'Win rate should be 75%');
});

// ==================== INTEGRATION TESTS ====================

testSuite.addTest('Full Trade Cycle Test', async () => {
    const engine = new TradingEngine(10000);
    engine.start();
    
    const asset = engine.dataEngine.getAsset('BTC');
    const position = engine.openPosition(asset, 'LONG', 'Break_of_Block');
    
    testSuite.assert(engine.positions.length === 1, 'Position should be opened');
    
    // Simulate reaching TP2
    asset.price = position.tp2 + 1;
    engine.updatePositions();
    
    testSuite.assert(engine.positions.length === 0, 'Position should be closed');
    testSuite.assert(engine.closedTrades.length === 1, 'Trade should be in history');
});

testSuite.addTest('Dual Position Management Test', () => {
    const engine = new TradingEngine(10000);
    
    const asset1 = engine.dataEngine.getAsset('BTC');
    const asset2 = engine.dataEngine.getAsset('ETH');
    
    const pos1 = engine.openPosition(asset1, 'LONG', 'Pattern1');
    
    // Slot 2 should not open until TP1 is hit
    testSuite.assert(engine.positions.length === 1, 'Only Slot 1 should be open');
    
    // Hit TP1
    asset1.price = pos1.tp1 + 1;
    engine.updatePositions();
    
    testSuite.assert(pos1.tp1Hit, 'TP1 should be hit');
    
    // Now Slot 2 can open
    const pos2 = engine.openPosition(asset2, 'SHORT', 'Pattern2');
    testSuite.assert(engine.positions.length === 2, 'Both slots should be open');
});

testSuite.addTest('Asset Diversification Test', () => {
    const engine = new TradingEngine(10000);
    
    const asset1 = engine.dataEngine.getAsset('BTC');
    engine.openPosition(asset1, 'LONG', 'Pattern1');
    
    const selectedAsset = engine.selectAsset();
    
    if (selectedAsset) {
        testSuite.assert(selectedAsset.symbol !== 'BTC', 'Should select different asset for Slot 2');
    }
});

// ==================== PERFORMANCE TESTS ====================

testSuite.addTest('Decision Time Performance Test', async () => {
    const engine = new TradingEngine(10000);
    engine.start();
    
    const startTime = performance.now();
    await engine.runAnalysisCycle();
    const duration = performance.now() - startTime;
    
    testSuite.assert(duration < 10000, `Decision time should be < 10s, got ${duration.toFixed(0)}ms`);
});

testSuite.addTest('Price Update Performance Test', () => {
    const engine = new TradingEngine(10000);
    
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
        engine.dataEngine.updatePrices();
    }
    const duration = performance.now() - startTime;
    
    testSuite.assert(duration < 1000, `100 price updates should take < 1s, got ${duration.toFixed(0)}ms`);
});

testSuite.addTest('Indicator Calculation Performance Test', () => {
    const engine = new TradingEngine(10000);
    
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
        engine.dataEngine.calculateIndicators('BTC');
        engine.dataEngine.calculateIndicators('ETH');
        engine.dataEngine.calculateIndicators('SOL');
    }
    const duration = performance.now() - startTime;
    
    testSuite.assert(duration < 500, `300 indicator calcs should take < 500ms, got ${duration.toFixed(0)}ms`);
});

// Export for use in app
window.testSuite = testSuite;
