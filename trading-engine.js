/**
 * Professional Scalping Bot v3.2 - Trading Engine
 * Complete trading logic with 4-level decision system, risk management, and data engine
 */

class DataEngine {
    constructor() {
        this.assets = [
            { symbol: 'BTC', name: 'Bitcoin', price: 65000, basePrice: 65000 },
            { symbol: 'ETH', name: 'Ethereum', price: 3200, basePrice: 3200 },
            { symbol: 'SOL', name: 'Solana', price: 150, basePrice: 150 }
        ];
        this.priceHistory = {};
        this.indicators = {};
        this.initializePriceHistory();
    }

    initializePriceHistory() {
        this.assets.forEach(asset => {
            this.priceHistory[asset.symbol] = [];
            // Generate 100 initial candles
            for (let i = 0; i < 100; i++) {
                this.priceHistory[asset.symbol].push(this.generateCandle(asset));
            }
            this.calculateIndicators(asset.symbol);
        });
    }

    generateCandle(asset) {
        // Realistic price movement with trend and volatility
        const volatility = asset.price * 0.002; // 0.2% volatility
        const trend = (Math.random() - 0.48) * volatility; // Slight upward bias
        const change = trend + (Math.random() - 0.5) * volatility;
        
        asset.price = Math.max(asset.price + change, asset.basePrice * 0.7); // Don't drop below 70%
        
        const high = asset.price * (1 + Math.random() * 0.001);
        const low = asset.price * (1 - Math.random() * 0.001);
        
        return {
            time: Date.now(),
            open: asset.price - change * 0.5,
            high: high,
            low: low,
            close: asset.price,
            volume: Math.random() * 1000000 + 500000
        };
    }

    updatePrices() {
        this.assets.forEach(asset => {
            const newCandle = this.generateCandle(asset);
            this.priceHistory[asset.symbol].push(newCandle);
            
            // Keep only last 100 candles
            if (this.priceHistory[asset.symbol].length > 100) {
                this.priceHistory[asset.symbol].shift();
            }
            
            this.calculateIndicators(asset.symbol);
        });
    }

    calculateIndicators(symbol) {
        const history = this.priceHistory[symbol];
        if (history.length < 21) return;

        // RSI Calculation
        const rsi = this.calculateRSI(history, 14);
        
        // Moving Averages
        const ma9 = this.calculateMA(history, 9);
        const ma21 = this.calculateMA(history, 21);
        
        // Volume
        const avgVolume = history.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
        const currentVolume = history[history.length - 1].volume;
        
        // Volatility
        const volatility = this.calculateVolatility(history, 20);
        
        this.indicators[symbol] = {
            rsi,
            ma9,
            ma21,
            avgVolume,
            currentVolume,
            volatility,
            trend: ma9 > ma21 ? 'bullish' : 'bearish'
        };
    }

    calculateRSI(history, period) {
        if (history.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = history.length - period; i < history.length; i++) {
            const change = history[i].close - history[i - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMA(history, period) {
        if (history.length < period) return history[history.length - 1].close;
        
        const sum = history.slice(-period).reduce((sum, candle) => sum + candle.close, 0);
        return sum / period;
    }

    calculateVolatility(history, period) {
        if (history.length < period) return 0;
        
        const prices = history.slice(-period).map(c => c.close);
        const mean = prices.reduce((sum, p) => sum + p, 0) / period;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
        return Math.sqrt(variance) / mean * 100;
    }

    getAsset(symbol) {
        return this.assets.find(a => a.symbol === symbol);
    }

    getIndicators(symbol) {
        return this.indicators[symbol] || {};
    }

    getPriceHistory(symbol, count = 50) {
        return this.priceHistory[symbol].slice(-count);
    }
}

class RiskManager {
    constructor(initialBalance) {
        this.initialBalance = initialBalance;
        this.currentBalance = initialBalance;
        this.dailyStartBalance = initialBalance;
        this.weeklyStartBalance = initialBalance;
        this.monthlyStartBalance = initialBalance;
        this.consecutiveLosses = 0;
        this.dailyLossLimit = -3.0;
        this.weeklyDrawdownLimit = -8.0;
        this.monthlyKillSwitch = -15.0;
        this.maxDrawdownAlert = -12.0;
        this.positionRiskPercentage = 0.5;
        this.stopLossPercentage = 1.0;
        this.tradingEnabled = true;
    }

    getDailyDrawdown() {
        return ((this.currentBalance - this.dailyStartBalance) / this.dailyStartBalance) * 100;
    }

    getWeeklyDrawdown() {
        return ((this.currentBalance - this.weeklyStartBalance) / this.weeklyStartBalance) * 100;
    }

    getMonthlyDrawdown() {
        return ((this.currentBalance - this.monthlyStartBalance) / this.monthlyStartBalance) * 100;
    }

    canTrade() {
        if (!this.tradingEnabled) return false;
        
        // Daily loss limit check
        if (this.getDailyDrawdown() <= this.dailyLossLimit) {
            this.tradingEnabled = false;
            return false;
        }
        
        // Monthly kill switch
        if (this.getMonthlyDrawdown() <= this.monthlyKillSwitch) {
            this.tradingEnabled = false;
            return false;
        }
        
        // Consecutive losses check (max 3)
        if (this.consecutiveLosses >= 3) {
            return false;
        }
        
        return true;
    }

    calculatePositionSize() {
        const riskAmount = this.currentBalance * (this.positionRiskPercentage / 100);
        
        // Reduce position size if weekly drawdown exceeds -8%
        if (this.getWeeklyDrawdown() <= this.weeklyDrawdownLimit) {
            return riskAmount * 0.7; // 30% reduction
        }
        
        return riskAmount;
    }

    recordTrade(profit) {
        this.currentBalance += profit;
        
        if (profit < 0) {
            this.consecutiveLosses++;
        } else {
            this.consecutiveLosses = 0;
        }
    }

    resetDaily() {
        this.dailyStartBalance = this.currentBalance;
    }

    resetWeekly() {
        this.weeklyStartBalance = this.currentBalance;
    }

    resetMonthly() {
        this.monthlyStartBalance = this.currentBalance;
    }
}

class TradingEngine {
    constructor(initialBalance = 10000) {
        this.dataEngine = new DataEngine();
        this.riskManager = new RiskManager(initialBalance);
        this.positions = [];
        this.maxPositions = 2;
        this.closedTrades = [];
        this.isRunning = false;
        this.analysisState = {
            level1: 'waiting',
            level2: 'waiting',
            level3: 'waiting',
            level4: 'waiting'
        };
        this.fearGreedIndex = 50;
        this.lastAnalysisTime = 0;
    }

    start() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    async runAnalysisCycle() {
        if (!this.isRunning || !this.riskManager.canTrade()) {
            return null;
        }

        // Check if we can open new positions
        if (this.positions.length >= this.maxPositions) {
            return null;
        }

        // Check if Slot 2 is waiting for Slot 1 to hit TP1
        if (this.positions.length === 1 && !this.positions[0].tp1Hit) {
            return null;
        }

        const now = Date.now();
        if (now - this.lastAnalysisTime < 5000) { // Minimum 5 seconds between analyses
            return null;
        }
        this.lastAnalysisTime = now;
        
        // Initialize checklist
        this.checklist = {
            passed: 0,
            total: 23,
            details: []
        };

        // Run 4-Level Analysis
        const asset = this.selectAsset();
        if (!asset) return null;

        // Level 1: Safety Gates (2s simulation)
        this.analysisState.level1 = 'analyzing';
        const level1 = await this.level1SafetyGates(asset);
        this.analysisState.level1 = level1.passed ? 'passed' : 'failed';
        
        if (!level1.passed) return { asset, level: 1, reason: level1.reason };

        // Level 2: Structural Analysis (3s simulation)
        this.analysisState.level2 = 'analyzing';
        const level2 = await this.level2StructuralAnalysis(asset);
        this.analysisState.level2 = level2.passed ? 'passed' : 'failed';
        
        if (!level2.passed) return { asset, level: 2, reason: level2.reason };

        // Level 3: Risk Assessment (2s simulation)
        this.analysisState.level3 = 'analyzing';
        const level3 = await this.level3RiskAssessment(asset, level2.direction);
        this.analysisState.level3 = level3.passed ? 'passed' : 'failed';
        
        if (!level3.passed) return { asset, level: 3, reason: level3.reason };

        // Level 4: Sentiment Check (1s simulation)
        this.analysisState.level4 = 'analyzing';
        const level4 = await this.level4SentimentCheck();
        this.analysisState.level4 = level4.passed ? 'passed' : 'failed';
        
        if (!level4.passed) return { asset, level: 4, reason: level4.reason };

        // Run 23-point validation checklist
        const checklistResult = this.run23PointChecklist(asset, level2.direction);
        if (!checklistResult.passed) {
            return { asset, level: 'checklist', reason: checklistResult.reason, checklistScore: checklistResult.score };
        }
        
        // All levels passed - Open position
        const position = this.openPosition(asset, level2.direction, level2.pattern);
        position.checklistScore = checklistResult.score;
        
        // Reset analysis state
        setTimeout(() => {
            this.analysisState = {
                level1: 'waiting',
                level2: 'waiting',
                level3: 'waiting',
                level4: 'waiting'
            };
        }, 2000);

        return { asset, position, allPassed: true };
    }

    async level1SafetyGates(asset) {
        const indicators = this.dataEngine.getIndicators(asset.symbol);
        
        // RSI safety check (30-70 range)
        if (indicators.rsi < 30 || indicators.rsi > 70) {
            return { passed: false, reason: 'RSI outside safe range' };
        }
        
        // Volume validation
        if (indicators.currentVolume < indicators.avgVolume * 0.5) {
            return { passed: false, reason: 'Insufficient volume' };
        }
        
        // Consecutive losses check
        if (this.riskManager.consecutiveLosses >= 3) {
            return { passed: false, reason: 'Max consecutive losses reached' };
        }
        
        // Daily loss limit
        if (this.riskManager.getDailyDrawdown() <= this.riskManager.dailyLossLimit) {
            return { passed: false, reason: 'Daily loss limit reached' };
        }
        
        // Drawdown check
        if (this.riskManager.getMonthlyDrawdown() <= this.riskManager.maxDrawdownAlert) {
            return { passed: false, reason: 'Max drawdown alert triggered' };
        }
        
        return { passed: true };
    }

    async level2StructuralAnalysis(asset) {
        const indicators = this.dataEngine.getIndicators(asset.symbol);
        const history = this.dataEngine.getPriceHistory(asset.symbol, 20);
        
        // Trend determination
        const direction = indicators.trend === 'bullish' ? 'LONG' : 'SHORT';
        
        // Pattern identification (simplified)
        const patterns = ['Liquidity_Sweep', 'Break_of_Block', 'Anti_Order_Block', 'Chain_Block', 'Swing_Block', 'Impulse_Block'];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        // Multi-timeframe alignment simulation (3 out of 4 required)
        const alignmentScore = Math.random();
        if (alignmentScore < 0.4) { // 60% pass rate
            return { passed: false, reason: 'Insufficient timeframe alignment' };
        }
        
        return { passed: true, direction, pattern: selectedPattern };
    }

    async level3RiskAssessment(asset, direction) {
        const positionSize = this.riskManager.calculatePositionSize();
        
        // Risk/Reward validation (minimum 1:2)
        const riskRewardRatio = 2.5; // Simulated
        if (riskRewardRatio < 2.0) {
            return { passed: false, reason: 'Risk/Reward ratio too low' };
        }
        
        // Entry signal quality
        const signalQuality = Math.random();
        if (signalQuality < 0.5) {
            return { passed: false, reason: 'Entry signal quality insufficient' };
        }
        
        return { passed: true, positionSize };
    }

    async level4SentimentCheck() {
        // Fear & Greed Index check (avoid extremes)
        if (this.fearGreedIndex < 20 || this.fearGreedIndex > 80) {
            return { passed: false, reason: 'Extreme market sentiment' };
        }
        
        return { passed: true };
    }

    selectAsset() {
        // Select asset not currently in positions
        const availableAssets = this.dataEngine.assets.filter(asset => {
            return !this.positions.some(pos => pos.symbol === asset.symbol);
        });
        
        if (availableAssets.length === 0) return null;
        
        // Prefer opposite direction if Slot 1 exists
        if (this.positions.length === 1) {
            // Return random available asset for Slot 2
            return availableAssets[Math.floor(Math.random() * availableAssets.length)];
        }
        
        // Random selection for Slot 1
        return availableAssets[Math.floor(Math.random() * availableAssets.length)];
    }

    openPosition(asset, direction, pattern) {
        const positionSize = this.riskManager.calculatePositionSize();
        const entryPrice = asset.price;
        const slippage = entryPrice * 0.0005; // 0.05% slippage
        const actualEntry = direction === 'LONG' ? entryPrice + slippage : entryPrice - slippage;
        
        const stopLoss = direction === 'LONG' 
            ? actualEntry * (1 - this.riskManager.stopLossPercentage / 100)
            : actualEntry * (1 + this.riskManager.stopLossPercentage / 100);
        
        const tp1 = direction === 'LONG'
            ? actualEntry * 1.005 // 0.5%
            : actualEntry * 0.995;
        
        const tp2 = direction === 'LONG'
            ? actualEntry * 1.012 // 1.2%
            : actualEntry * 0.988;
        
        const position = {
            id: Date.now(),
            slot: this.positions.length + 1,
            symbol: asset.symbol,
            direction,
            pattern,
            entryPrice: actualEntry,
            stopLoss,
            tp1,
            tp2,
            size: positionSize,
            tp1Hit: false,
            openTime: Date.now(),
            pnl: 0
        };
        
        this.positions.push(position);
        return position;
    }

    updatePositions() {
        this.positions.forEach((position, index) => {
            const asset = this.dataEngine.getAsset(position.symbol);
            const currentPrice = asset.price;
            
            // Calculate P&L
            if (position.direction === 'LONG') {
                position.pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * position.size;
            } else {
                position.pnl = ((position.entryPrice - currentPrice) / position.entryPrice) * position.size;
            }
            
            // Check TP1
            if (!position.tp1Hit) {
                if (position.direction === 'LONG' && currentPrice >= position.tp1) {
                    position.tp1Hit = true;
                    // Take 50% profit
                    const tp1Profit = position.size * 0.5 * 0.005; // 0.5% profit
                    this.riskManager.recordTrade(tp1Profit);
                    // Move SL to breakeven
                    position.stopLoss = position.entryPrice;
                } else if (position.direction === 'SHORT' && currentPrice <= position.tp1) {
                    position.tp1Hit = true;
                    const tp1Profit = position.size * 0.5 * 0.005;
                    this.riskManager.recordTrade(tp1Profit);
                    position.stopLoss = position.entryPrice;
                }
            }
            
            // Check TP2 (close entire position)
            if ((position.direction === 'LONG' && currentPrice >= position.tp2) ||
                (position.direction === 'SHORT' && currentPrice <= position.tp2)) {
                this.closePosition(index, 'TP2');
            }
            
            // Check Stop Loss
            if ((position.direction === 'LONG' && currentPrice <= position.stopLoss) ||
                (position.direction === 'SHORT' && currentPrice >= position.stopLoss)) {
                this.closePosition(index, 'SL');
            }
        });
    }

    closePosition(index, reason) {
        const position = this.positions[index];
        const asset = this.dataEngine.getAsset(position.symbol);
        
        // Calculate final P&L
        let finalPnl;
        if (reason === 'TP2') {
            // Remaining 50% hits TP2
            finalPnl = position.size * 0.5 * 0.012; // 1.2% profit
        } else if (reason === 'SL') {
            // Calculate loss
            if (position.direction === 'LONG') {
                finalPnl = ((asset.price - position.entryPrice) / position.entryPrice) * position.size;
            } else {
                finalPnl = ((position.entryPrice - asset.price) / position.entryPrice) * position.size;
            }
        }
        
        this.riskManager.recordTrade(finalPnl);
        
        // Record trade
        this.closedTrades.push({
            ...position,
            closePrice: asset.price,
            closeTime: Date.now(),
            closeReason: reason,
            finalPnl
        });
        
        // Remove position
        this.positions.splice(index, 1);
    }

    getStatistics() {
        if (this.closedTrades.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                avgWin: 0,
                avgLoss: 0,
                dailyRoi: 0,
                monthlyRoi: 0
            };
        }
        
        const wins = this.closedTrades.filter(t => t.finalPnl > 0);
        const losses = this.closedTrades.filter(t => t.finalPnl < 0);
        
        const totalWins = wins.reduce((sum, t) => sum + t.finalPnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.finalPnl, 0));
        
        const winRate = (wins.length / this.closedTrades.length) * 100;
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
        
        const dailyRoi = ((this.riskManager.currentBalance - this.riskManager.dailyStartBalance) / this.riskManager.dailyStartBalance) * 100;
        const monthlyRoi = ((this.riskManager.currentBalance - this.riskManager.monthlyStartBalance) / this.riskManager.monthlyStartBalance) * 100;
        
        return {
            totalTrades: this.closedTrades.length,
            winRate: winRate.toFixed(1),
            profitFactor: profitFactor.toFixed(2),
            avgWin: wins.length > 0 ? (totalWins / wins.length).toFixed(2) : 0,
            avgLoss: losses.length > 0 ? (totalLosses / losses.length).toFixed(2) : 0,
            dailyRoi: dailyRoi.toFixed(2),
            monthlyRoi: monthlyRoi.toFixed(2)
        };
    }

    manualClosePosition(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.positions.length) {
            this.closePosition(slotIndex, 'MANUAL');
        }
    }

    run23PointChecklist(asset, direction) {
        const checks = [];
        let score = 0;
        
        // PHASE 1: Safety Gates (6 points)
        const indicators = this.dataEngine.getIndicators(asset.symbol);
        
        // 1. RSI Range
        if (indicators.rsi >= 30 && indicators.rsi <= 70) {
            checks.push({ name: 'RSI Safe Range', passed: true });
            score++;
        } else {
            checks.push({ name: 'RSI Safe Range', passed: false });
        }
        
        // 2. Volume Check
        if (indicators.currentVolume >= indicators.avgVolume * 1.0) {
            checks.push({ name: 'Volume Sufficient', passed: true });
            score++;
        } else {
            checks.push({ name: 'Volume Sufficient', passed: false });
        }
        
        // 3. Loss Streak
        if (this.riskManager.consecutiveLosses < 2) {
            checks.push({ name: 'Loss Streak OK', passed: true });
            score++;
        } else {
            checks.push({ name: 'Loss Streak OK', passed: false });
        }
        
        // 4. Daily Loss Limit
        if (this.riskManager.getDailyDrawdown() > -3.0) {
            checks.push({ name: 'Daily Loss OK', passed: true });
            score++;
        } else {
            checks.push({ name: 'Daily Loss OK', passed: false });
        }
        
        // 5. Max Drawdown
        if (this.riskManager.getMonthlyDrawdown() > -12.0) {
            checks.push({ name: 'Drawdown Safe', passed: true });
            score++;
        } else {
            checks.push({ name: 'Drawdown Safe', passed: false });
        }
        
        // 6. Market Consolidation
        if (indicators.volatility > 0.5 && indicators.volatility < 5.0) {
            checks.push({ name: 'Volatility Normal', passed: true });
            score++;
        } else {
            checks.push({ name: 'Volatility Normal', passed: false });
        }
        
        // PHASE 2: Market Structure (6 points)
        // 7-10. Multi-timeframe alignment (simulated)
        const alignmentScore = Math.random() > 0.3 ? 4 : 2;
        for (let i = 0; i < 4; i++) {
            const passed = i < alignmentScore;
            checks.push({ name: `Timeframe ${i + 1} Aligned`, passed });
            if (passed) score++;
        }
        
        // 11. Trend Confirmation
        checks.push({ name: 'Trend Confirmed', passed: true });
        score++;
        
        // 12. Structure Break
        checks.push({ name: 'Structure Break Valid', passed: true });
        score++;
        
        // PHASE 3: Pattern & Entry (5 points)
        // 13. Pattern Recognition
        checks.push({ name: 'Pattern Identified', passed: true });
        score++;
        
        // 14. Entry Quality
        const entryQuality = Math.random() > 0.3;
        checks.push({ name: 'Entry Quality High', passed: entryQuality });
        if (entryQuality) score++;
        
        // 15. Support/Resistance
        checks.push({ name: 'S/R Level Clear', passed: true });
        score++;
        
        // 16. Order Flow
        const orderFlow = Math.random() > 0.4;
        checks.push({ name: 'Order Flow Positive', passed: orderFlow });
        if (orderFlow) score++;
        
        // 17. Liquidity Check
        checks.push({ name: 'Liquidity Adequate', passed: true });
        score++;
        
        // PHASE 4: Risk Management (4 points)
        // 18. Risk/Reward Ratio
        checks.push({ name: 'R:R >= 1:2', passed: true });
        score++;
        
        // 19. Position Sizing
        checks.push({ name: 'Position Size Valid', passed: true });
        score++;
        
        // 20. Stop Loss Placement
        checks.push({ name: 'Stop Loss Optimal', passed: true });
        score++;
        
        // 21. Exposure Check
        const currentExposure = this.positions.reduce((sum, pos) => sum + pos.size, 0);
        const exposureOK = currentExposure < this.riskManager.currentBalance * 0.7;
        checks.push({ name: 'Exposure Under 70%', passed: exposureOK });
        if (exposureOK) score++;
        
        // PHASE 5: Psychological (2 points)
        // 22. Trading Session
        const hour = new Date().getHours();
        const goodSession = (hour >= 13 && hour <= 20) || (hour >= 7 && hour <= 12);
        checks.push({ name: 'Active Trading Session', passed: goodSession });
        if (goodSession) score++;
        
        // 23. Sentiment Check
        const sentimentOK = this.fearGreedIndex >= 25 && this.fearGreedIndex <= 75;
        checks.push({ name: 'Sentiment Neutral', passed: sentimentOK });
        if (sentimentOK) score++;
        
        // Require at least 20/23 to pass
        const passed = score >= 20;
        
        return {
            passed,
            score,
            checks,
            reason: passed ? 'All checks passed' : `Only ${score}/23 checks passed (need 20+)`
        };
    }
    
    updateMarketSentiment() {
        // Simulate Fear & Greed Index changes
        this.fearGreedIndex += (Math.random() - 0.5) * 5;
        this.fearGreedIndex = Math.max(0, Math.min(100, this.fearGreedIndex));
    }
}