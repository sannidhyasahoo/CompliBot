/**
 * Reporting Tool
 * Generates comprehensive GST reports and analytics
 */

const gstCalculator = require('./gstCalculator');
const { formatGSTDate, generateFilingPeriod } = require('../modules/gstHelper');
const { formatJson } = require('../modules/jsonHelper');

/**
 * Generate GST summary report
 * @param {object} params - Summary report parameters
 * @returns {object} - Summary report result
 */
async function generateGSTSummaryReport(params) {
    const {
        gstin,
        period,
        transactions = [],
        includeAnalytics = true,
        includeCharts = false
    } = params;

    try {
        // Validate GSTIN
        const gstinValidation = await gstCalculator.validateGSTINFormat({ gstin });
        if (!gstinValidation.success) {
            throw new Error(`Invalid GSTIN: ${gstinValidation.error}`);
        }

        // Process transactions
        const processedData = processTransactions(transactions);

        // Generate analytics if requested
        let analytics = null;
        if (includeAnalytics) {
            analytics = generateAnalytics(processedData);
        }

        const summaryReport = {
            reportType: 'GST_SUMMARY_REPORT',
            reportPeriod: period,
            taxpayer: {
                gstin: gstin,
                stateCode: gstinValidation.data.stateCode,
                stateName: gstinValidation.data.stateName
            },
            summary: {
                totalTransactions: transactions.length,
                totalTurnover: processedData.totalTurnover,
                totalTaxCollected: processedData.totalTaxCollected,
                totalTaxPaid: processedData.totalTaxPaid,
                netTaxLiability: processedData.totalTaxCollected - processedData.totalTaxPaid,
                totalITCAvailed: processedData.totalITCAvailed
            },
            breakdown: {
                outwardSupplies: processedData.outwardSupplies,
                inwardSupplies: processedData.inwardSupplies,
                taxRateWise: processedData.taxRateWise,
                stateWise: processedData.stateWise
            },
            analytics: analytics,
            compliance: {
                filingStatus: 'PENDING',
                dueDate: calculateDueDate(period),
                penaltyRisk: processedData.netTaxLiability > 0 ? 'YES' : 'NO'
            },
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                summaryReport: summaryReport,
                summary: summaryReport.summary,
                analytics: analytics
            },
            message: `GST summary report generated for period ${period}`,
            actions: [{
                type: 'summary_report_generated',
                payload: {
                    gstin: gstin,
                    period: period,
                    totalTurnover: processedData.totalTurnover,
                    netTaxLiability: processedData.totalTaxCollected - processedData.totalTaxPaid,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate GST summary report: ${error.message}`
        };
    }
}

/**
 * Generate tax liability report
 * @param {object} params - Tax liability parameters
 * @returns {object} - Tax liability report result
 */
async function generateTaxLiabilityReport(params) {
    const {
        gstin,
        period,
        outwardSupplies = [],
        inwardSupplies = [],
        previousBalance = 0
    } = params;

    try {
        // Calculate tax on outward supplies
        const outwardTax = calculateOutwardTax(outwardSupplies);

        // Calculate ITC on inward supplies
        const inwardITC = calculateInwardITC(inwardSupplies);

        // Calculate net liability
        const netLiability = outwardTax.totalTax - inwardITC.totalITC + previousBalance;

        const taxLiabilityReport = {
            reportType: 'TAX_LIABILITY_REPORT',
            period: period,
            taxpayer: { gstin: gstin },
            outwardSupplies: {
                count: outwardSupplies.length,
                totalValue: outwardTax.totalValue,
                taxBreakdown: outwardTax.breakdown,
                totalTax: outwardTax.totalTax
            },
            inwardSupplies: {
                count: inwardSupplies.length,
                totalValue: inwardITC.totalValue,
                itcBreakdown: inwardITC.breakdown,
                totalITC: inwardITC.totalITC
            },
            liability: {
                grossTaxLiability: outwardTax.totalTax,
                totalITCAvailed: inwardITC.totalITC,
                previousBalance: previousBalance,
                netTaxLiability: Math.max(netLiability, 0),
                itcLapseRisk: inwardITC.lapseRisk
            },
            paymentDetails: {
                cgst: Math.max((outwardTax.breakdown.cgst - inwardITC.breakdown.cgst), 0),
                sgst: Math.max((outwardTax.breakdown.sgst - inwardITC.breakdown.sgst), 0),
                igst: Math.max((outwardTax.breakdown.igst - inwardITC.breakdown.igst), 0),
                cess: Math.max((outwardTax.breakdown.cess - inwardITC.breakdown.cess), 0)
            },
            recommendations: generateTaxRecommendations(netLiability, inwardITC.lapseRisk),
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                taxLiabilityReport: taxLiabilityReport,
                summary: {
                    netLiability: netLiability,
                    totalTax: outwardTax.totalTax,
                    totalITC: inwardITC.totalITC,
                    paymentRequired: netLiability > 0
                }
            },
            message: `Tax liability: ₹${netLiability.toLocaleString('en-IN')} ${netLiability > 0 ? 'payable' : 'refund due'}`,
            actions: [{
                type: 'tax_liability_calculated',
                payload: {
                    gstin: gstin,
                    period: period,
                    netLiability: netLiability,
                    paymentRequired: netLiability > 0
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate tax liability report: ${error.message}`
        };
    }
}

/**
 * Generate reconciliation report
 * @param {object} params - Reconciliation parameters
 * @returns {object} - Reconciliation report result
 */
async function generateReconciliationReport(params) {
    const {
        gstin,
        period,
        booksData = [],
        gstr1Data = [],
        gstr2aData = []
    } = params;

    try {
        // Reconcile outward supplies (Books vs GSTR-1)
        const outwardReconciliation = reconcileOutwardSupplies(booksData, gstr1Data);

        // Reconcile inward supplies (Books vs GSTR-2A)
        const inwardReconciliation = reconcileInwardSupplies(booksData, gstr2aData);

        const reconciliationReport = {
            reportType: 'GST_RECONCILIATION_REPORT',
            period: period,
            taxpayer: { gstin: gstin },
            outwardReconciliation: {
                booksTotal: outwardReconciliation.booksTotal,
                gstr1Total: outwardReconciliation.gstr1Total,
                difference: outwardReconciliation.difference,
                matchedTransactions: outwardReconciliation.matched,
                unmatchedInBooks: outwardReconciliation.unmatchedBooks,
                unmatchedInGSTR1: outwardReconciliation.unmatchedGSTR1,
                reconciliationRate: outwardReconciliation.reconciliationRate
            },
            inwardReconciliation: {
                booksTotal: inwardReconciliation.booksTotal,
                gstr2aTotal: inwardReconciliation.gstr2aTotal,
                difference: inwardReconciliation.difference,
                matchedTransactions: inwardReconciliation.matched,
                unmatchedInBooks: inwardReconciliation.unmatchedBooks,
                unmatchedInGSTR2A: inwardReconciliation.unmatchedGSTR2A,
                reconciliationRate: inwardReconciliation.reconciliationRate
            },
            summary: {
                totalDiscrepancies: outwardReconciliation.unmatchedBooks.length +
                    outwardReconciliation.unmatchedGSTR1.length +
                    inwardReconciliation.unmatchedBooks.length +
                    inwardReconciliation.unmatchedGSTR2A.length,
                overallReconciliationRate: (outwardReconciliation.reconciliationRate +
                    inwardReconciliation.reconciliationRate) / 2,
                actionRequired: true
            },
            recommendations: [
                'Review unmatched transactions',
                'Update books of accounts for missing entries',
                'File amendments if necessary',
                'Implement better record keeping practices'
            ],
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                reconciliationReport: reconciliationReport,
                summary: reconciliationReport.summary
            },
            message: `Reconciliation completed. ${reconciliationReport.summary.totalDiscrepancies} discrepancies found`,
            actions: [{
                type: 'reconciliation_completed',
                payload: {
                    gstin: gstin,
                    period: period,
                    discrepancies: reconciliationReport.summary.totalDiscrepancies,
                    reconciliationRate: reconciliationReport.summary.overallReconciliationRate
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate reconciliation report: ${error.message}`
        };
    }
}

/**
 * Generate analytics dashboard data
 * @param {object} params - Analytics parameters
 * @returns {object} - Analytics dashboard result
 */
async function generateAnalyticsDashboard(params) {
    const {
        gstin,
        periods = [],
        transactions = [],
        includeForecasting = false
    } = params;

    try {
        // Process historical data
        const historicalData = processHistoricalData(periods, transactions);

        // Generate trends
        const trends = calculateTrends(historicalData);

        // Generate forecasting if requested
        let forecasting = null;
        if (includeForecasting) {
            forecasting = generateForecasting(trends);
        }

        const dashboard = {
            reportType: 'GST_ANALYTICS_DASHBOARD',
            taxpayer: { gstin: gstin },
            timeRange: {
                from: periods.length > 0 ? periods[0] : null,
                to: periods.length > 0 ? periods[periods.length - 1] : null,
                periodsAnalyzed: periods.length
            },
            kpis: {
                averageMonthlyTurnover: historicalData.averageTurnover,
                averageMonthlyTax: historicalData.averageTax,
                averageEffectiveRate: historicalData.averageEffectiveRate,
                growthRate: trends.turnoverGrowth,
                complianceScore: historicalData.complianceScore
            },
            trends: {
                turnover: trends.turnover,
                taxLiability: trends.taxLiability,
                itcUtilization: trends.itcUtilization,
                effectiveRate: trends.effectiveRate
            },
            insights: generateInsights(historicalData, trends),
            forecasting: forecasting,
            recommendations: generateAnalyticsRecommendations(trends, historicalData),
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                dashboard: dashboard,
                kpis: dashboard.kpis,
                trends: dashboard.trends,
                insights: dashboard.insights
            },
            message: `Analytics dashboard generated for ${periods.length} periods`,
            actions: [{
                type: 'analytics_dashboard_generated',
                payload: {
                    gstin: gstin,
                    periodsAnalyzed: periods.length,
                    kpis: dashboard.kpis,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate analytics dashboard: ${error.message}`
        };
    }
}

// Helper functions

function processTransactions(transactions) {
    let totalTurnover = 0;
    let totalTaxCollected = 0;
    let totalTaxPaid = 0;
    let totalITCAvailed = 0;

    const outwardSupplies = [];
    const inwardSupplies = [];
    const taxRateWise = {};
    const stateWise = {};

    transactions.forEach(txn => {
        if (txn.type === 'outward') {
            totalTurnover += txn.value;
            totalTaxCollected += txn.tax;
            outwardSupplies.push(txn);
        } else if (txn.type === 'inward') {
            totalTaxPaid += txn.tax;
            totalITCAvailed += txn.itc || 0;
            inwardSupplies.push(txn);
        }

        // Group by tax rate
        const rate = txn.taxRate || 0;
        if (!taxRateWise[rate]) {
            taxRateWise[rate] = { count: 0, value: 0, tax: 0 };
        }
        taxRateWise[rate].count++;
        taxRateWise[rate].value += txn.value;
        taxRateWise[rate].tax += txn.tax;

        // Group by state
        const state = txn.state || 'Unknown';
        if (!stateWise[state]) {
            stateWise[state] = { count: 0, value: 0, tax: 0 };
        }
        stateWise[state].count++;
        stateWise[state].value += txn.value;
        stateWise[state].tax += txn.tax;
    });

    return {
        totalTurnover,
        totalTaxCollected,
        totalTaxPaid,
        totalITCAvailed,
        outwardSupplies,
        inwardSupplies,
        taxRateWise,
        stateWise
    };
}

function generateAnalytics(processedData) {
    return {
        effectiveTaxRate: processedData.totalTurnover > 0 ?
            (processedData.totalTaxCollected / processedData.totalTurnover * 100).toFixed(2) + '%' : '0%',
        itcUtilizationRate: processedData.totalTaxPaid > 0 ?
            (processedData.totalITCAvailed / processedData.totalTaxPaid * 100).toFixed(2) + '%' : '0%',
        netTaxRate: processedData.totalTurnover > 0 ?
            ((processedData.totalTaxCollected - processedData.totalITCAvailed) / processedData.totalTurnover * 100).toFixed(2) + '%' : '0%',
        topTaxRates: Object.entries(processedData.taxRateWise)
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, 5),
        topStates: Object.entries(processedData.stateWise)
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, 5)
    };
}

function calculateDueDate(period) {
    // Simplified due date calculation
    const month = parseInt(period.substring(0, 2));
    const year = parseInt(period.substring(2));
    return formatGSTDate(new Date(year, month, 20)); // 20th of next month
}

function calculateOutwardTax(outwardSupplies) {
    let totalValue = 0;
    let totalTax = 0;
    const breakdown = { cgst: 0, sgst: 0, igst: 0, cess: 0 };

    outwardSupplies.forEach(supply => {
        totalValue += supply.value || 0;
        totalTax += supply.tax || 0;
        breakdown.cgst += supply.cgst || 0;
        breakdown.sgst += supply.sgst || 0;
        breakdown.igst += supply.igst || 0;
        breakdown.cess += supply.cess || 0;
    });

    return { totalValue, totalTax, breakdown };
}

function calculateInwardITC(inwardSupplies) {
    let totalValue = 0;
    let totalITC = 0;
    const breakdown = { cgst: 0, sgst: 0, igst: 0, cess: 0 };
    let lapseRisk = false;

    inwardSupplies.forEach(supply => {
        totalValue += supply.value || 0;
        totalITC += supply.itc || 0;
        breakdown.cgst += supply.cgst || 0;
        breakdown.sgst += supply.sgst || 0;
        breakdown.igst += supply.igst || 0;
        breakdown.cess += supply.cess || 0;

        // Check for ITC lapse risk (simplified)
        if (supply.invoiceDate) {
            const invoiceDate = new Date(supply.invoiceDate);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - invoiceDate.getFullYear()) * 12 +
                (now.getMonth() - invoiceDate.getMonth());
            if (monthsDiff > 10) { // ITC lapse risk after 10 months
                lapseRisk = true;
            }
        }
    });

    return { totalValue, totalITC, breakdown, lapseRisk };
}

function generateTaxRecommendations(netLiability, lapseRisk) {
    const recommendations = [];

    if (netLiability > 0) {
        recommendations.push('Pay tax liability before due date to avoid interest');
        recommendations.push('Consider advance tax payment for better cash flow');
    } else if (netLiability < 0) {
        recommendations.push('Excess ITC available - consider refund claim');
    }

    if (lapseRisk) {
        recommendations.push('Some ITC may lapse soon - review and claim immediately');
    }

    recommendations.push('Regular reconciliation to avoid last-minute issues');

    return recommendations;
}

function reconcileOutwardSupplies(booksData, gstr1Data) {
    // Simplified reconciliation logic
    const booksTotal = booksData.reduce((sum, item) => sum + (item.value || 0), 0);
    const gstr1Total = gstr1Data.reduce((sum, item) => sum + (item.value || 0), 0);

    return {
        booksTotal,
        gstr1Total,
        difference: booksTotal - gstr1Total,
        matched: Math.min(booksData.length, gstr1Data.length),
        unmatchedBooks: booksData.slice(gstr1Data.length),
        unmatchedGSTR1: gstr1Data.slice(booksData.length),
        reconciliationRate: booksData.length > 0 ?
            (Math.min(booksData.length, gstr1Data.length) / booksData.length * 100).toFixed(2) : 0
    };
}

function reconcileInwardSupplies(booksData, gstr2aData) {
    // Simplified reconciliation logic
    const booksTotal = booksData.reduce((sum, item) => sum + (item.value || 0), 0);
    const gstr2aTotal = gstr2aData.reduce((sum, item) => sum + (item.value || 0), 0);

    return {
        booksTotal,
        gstr2aTotal,
        difference: booksTotal - gstr2aTotal,
        matched: Math.min(booksData.length, gstr2aData.length),
        unmatchedBooks: booksData.slice(gstr2aData.length),
        unmatchedGSTR2A: gstr2aData.slice(booksData.length),
        reconciliationRate: booksData.length > 0 ?
            (Math.min(booksData.length, gstr2aData.length) / booksData.length * 100).toFixed(2) : 0
    };
}

function processHistoricalData(periods, transactions) {
    const totalTurnover = transactions.reduce((sum, txn) => sum + (txn.value || 0), 0);
    const totalTax = transactions.reduce((sum, txn) => sum + (txn.tax || 0), 0);

    return {
        averageTurnover: periods.length > 0 ? totalTurnover / periods.length : 0,
        averageTax: periods.length > 0 ? totalTax / periods.length : 0,
        averageEffectiveRate: totalTurnover > 0 ? (totalTax / totalTurnover * 100).toFixed(2) + '%' : '0%',
        complianceScore: 85 // Simplified score
    };
}

function calculateTrends(historicalData) {
    return {
        turnover: { trend: 'increasing', rate: '5%' },
        taxLiability: { trend: 'stable', rate: '2%' },
        itcUtilization: { trend: 'improving', rate: '8%' },
        effectiveRate: { trend: 'stable', rate: '0.5%' },
        turnoverGrowth: '5%'
    };
}

function generateInsights(historicalData, trends) {
    return [
        `Average monthly turnover: ₹${historicalData.averageTurnover.toLocaleString('en-IN')}`,
        `Effective tax rate: ${historicalData.averageEffectiveRate}`,
        `Turnover trend: ${trends.turnover.trend} at ${trends.turnover.rate}`,
        `Compliance score: ${historicalData.complianceScore}/100`
    ];
}

function generateForecasting(trends) {
    return {
        nextPeriodTurnover: 'Projected 5% increase',
        nextPeriodTax: 'Projected 2% increase',
        riskFactors: ['Market volatility', 'Regulatory changes'],
        opportunities: ['ITC optimization', 'Process automation']
    };
}

function generateAnalyticsRecommendations(trends, historicalData) {
    return [
        'Monitor turnover trends for business planning',
        'Optimize ITC utilization to reduce effective tax rate',
        'Implement automated reconciliation processes',
        'Regular compliance health checks'
    ];
}

module.exports = {
    generateGSTSummaryReport,
    generateTaxLiabilityReport,
    generateReconciliationReport,
    generateAnalyticsDashboard
};