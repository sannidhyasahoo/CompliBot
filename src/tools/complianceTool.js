/**
 * Compliance Tool
 * Provides GST compliance checking and guidance capabilities
 */

const gstCalculator = require('./gstCalculator');
const { GST_STATE_CODES, formatGSTDate } = require('../modules/gstHelper');

/**
 * Check GST compliance status
 * @param {object} params - Compliance check parameters
 * @returns {object} - Compliance check result
 */
async function checkGSTCompliance(params) {
    const {
        gstin,
        turnover,
        businessType = 'regular',
        filingHistory = [],
        currentPeriod
    } = params;

    try {
        // Validate GSTIN
        const gstinValidation = await gstCalculator.validateGSTINFormat({ gstin });
        if (!gstinValidation.success) {
            throw new Error(`Invalid GSTIN: ${gstinValidation.error}`);
        }

        // Determine compliance requirements based on turnover
        const complianceRequirements = determineComplianceRequirements(turnover, businessType);

        // Check filing compliance
        const filingCompliance = checkFilingCompliance(filingHistory, currentPeriod);

        // Check registration compliance
        const registrationCompliance = checkRegistrationCompliance(turnover, gstin);

        // Generate compliance score
        const complianceScore = calculateComplianceScore(filingCompliance, registrationCompliance);

        const complianceReport = {
            reportType: 'GST_COMPLIANCE_CHECK',
            taxpayer: {
                gstin: gstin,
                stateCode: gstinValidation.data.stateCode,
                stateName: gstinValidation.data.stateName,
                businessType: businessType,
                turnover: turnover
            },
            complianceScore: complianceScore,
            requirements: complianceRequirements,
            filingCompliance: filingCompliance,
            registrationCompliance: registrationCompliance,
            recommendations: generateComplianceRecommendations(complianceScore, filingCompliance),
            riskLevel: determineRiskLevel(complianceScore),
            nextActions: generateNextActions(filingCompliance, complianceScore),
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                complianceReport: complianceReport,
                summary: {
                    overallScore: complianceScore.overall,
                    riskLevel: complianceReport.riskLevel,
                    criticalIssues: complianceScore.criticalIssues,
                    recommendationsCount: complianceReport.recommendations.length
                }
            },
            message: `Compliance check completed. Overall score: ${complianceScore.overall}/100`,
            actions: [{
                type: 'compliance_checked',
                payload: {
                    gstin: gstin,
                    score: complianceScore.overall,
                    riskLevel: complianceReport.riskLevel,
                    needsAttention: complianceScore.overall < 70
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check GST compliance: ${error.message}`
        };
    }
}

/**
 * Get GST rate recommendations for products/services
 * @param {object} params - Rate recommendation parameters
 * @returns {object} - Rate recommendation result
 */
async function getGSTRateRecommendations(params) {
    const { products = [], services = [], hsnCodes = [] } = params;

    try {
        const recommendations = [];

        // Process products
        for (const product of products) {
            const rateInfo = await gstCalculator.getGSTRateInfo({
                description: product,
                hsnCode: hsnCodes.find(code => product.toLowerCase().includes(code.toLowerCase()))
            });

            recommendations.push({
                item: product,
                type: 'product',
                rateInfo: rateInfo.data || { rate: 18, description: 'Standard rate applies' },
                confidence: rateInfo.success ? 'high' : 'medium'
            });
        }

        // Process services
        for (const service of services) {
            recommendations.push({
                item: service,
                type: 'service',
                rateInfo: { rate: 18, description: 'Standard service rate' },
                confidence: 'medium',
                note: 'Most services are taxed at 18%. Check specific exemptions.'
            });
        }

        const rateReport = {
            reportType: 'GST_RATE_RECOMMENDATIONS',
            itemsAnalyzed: products.length + services.length,
            recommendations: recommendations,
            summary: {
                zeroRated: recommendations.filter(r => r.rateInfo.rate === 0).length,
                lowRate: recommendations.filter(r => r.rateInfo.rate === 5).length,
                mediumRate: recommendations.filter(r => r.rateInfo.rate === 12).length,
                standardRate: recommendations.filter(r => r.rateInfo.rate === 18).length,
                highRate: recommendations.filter(r => r.rateInfo.rate === 28).length
            },
            generalGuidance: [
                'Verify HSN/SAC codes for accurate rate determination',
                'Check for recent rate changes in GST notifications',
                'Consider input tax credit implications',
                'Review exemption notifications if applicable'
            ],
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                rateReport: rateReport,
                summary: rateReport.summary
            },
            message: `GST rate recommendations generated for ${rateReport.itemsAnalyzed} items`,
            actions: [{
                type: 'rate_recommendations_generated',
                payload: {
                    itemCount: rateReport.itemsAnalyzed,
                    recommendations: recommendations
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate GST rate recommendations: ${error.message}`
        };
    }
}

/**
 * Check input tax credit eligibility
 * @param {object} params - ITC eligibility parameters
 * @returns {object} - ITC eligibility result
 */
async function checkITCEligibility(params) {
    const {
        gstin,
        supplierGSTIN,
        invoiceAmount,
        gstAmount,
        invoiceDate,
        goodsOrServices = 'goods',
        businessUse = true
    } = params;

    try {
        // Validate GSTINs
        const recipientValidation = await gstCalculator.validateGSTINFormat({ gstin });
        const supplierValidation = await gstCalculator.validateGSTINFormat({ gstin: supplierGSTIN });

        if (!recipientValidation.success || !supplierValidation.success) {
            throw new Error('Invalid GSTIN format');
        }

        // Check ITC eligibility conditions
        const eligibilityChecks = {
            validSupplierGSTIN: supplierValidation.success,
            validRecipientGSTIN: recipientValidation.success,
            invoiceInPossession: true, // Assumed
            goodsReceived: goodsOrServices === 'goods' ? true : null,
            servicesReceived: goodsOrServices === 'services' ? true : null,
            businessPurpose: businessUse,
            withinTimeLimit: checkITCTimeLimit(invoiceDate),
            supplierFiled: true // Would need to check actual GSTR-1 data
        };

        const eligibleAmount = calculateEligibleITC(gstAmount, eligibilityChecks);
        const restrictions = getITCRestrictions(goodsOrServices, invoiceAmount);

        const itcReport = {
            reportType: 'ITC_ELIGIBILITY_CHECK',
            invoice: {
                supplierGSTIN: supplierGSTIN,
                recipientGSTIN: gstin,
                amount: invoiceAmount,
                gstAmount: gstAmount,
                date: invoiceDate,
                type: goodsOrServices
            },
            eligibility: {
                isEligible: eligibleAmount > 0,
                eligibleAmount: eligibleAmount,
                eligibilityChecks: eligibilityChecks,
                restrictions: restrictions
            },
            recommendations: [
                'Ensure invoice is in your possession',
                'Verify goods/services are received',
                'Check supplier has filed their GSTR-1',
                'Claim ITC within the prescribed time limit'
            ],
            warnings: restrictions.length > 0 ? restrictions : [
                'No specific restrictions identified'
            ],
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                itcReport: itcReport,
                summary: {
                    isEligible: itcReport.eligibility.isEligible,
                    eligibleAmount: eligibleAmount,
                    restrictionsCount: restrictions.length
                }
            },
            message: `ITC eligibility: ${itcReport.eligibility.isEligible ? 'Eligible' : 'Not Eligible'} for ₹${eligibleAmount}`,
            actions: [{
                type: 'itc_eligibility_checked',
                payload: {
                    isEligible: itcReport.eligibility.isEligible,
                    eligibleAmount: eligibleAmount,
                    supplierGSTIN: supplierGSTIN,
                    recipientGSTIN: gstin
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check ITC eligibility: ${error.message}`
        };
    }
}

/**
 * Generate compliance calendar
 * @param {object} params - Calendar parameters
 * @returns {object} - Compliance calendar result
 */
async function generateComplianceCalendar(params) {
    const { year = new Date().getFullYear(), businessType = 'regular' } = params;

    try {
        const calendar = [];

        // Generate monthly compliance dates
        for (let month = 1; month <= 12; month++) {
            const monthData = {
                month: month,
                monthName: new Date(year, month - 1).toLocaleString('en-US', { month: 'long' }),
                year: year,
                dueDates: {
                    'GSTR-1': new Date(year, month, 11), // 11th of next month
                    'GSTR-3B': new Date(year, month, 20), // 20th of next month
                    'GSTR-9': month === 12 ? new Date(year + 1, 11, 31) : null // Annual return
                },
                activities: [
                    'Collect and organize invoices',
                    'Reconcile purchase and sales data',
                    'File GSTR-1 by 11th',
                    'File GSTR-3B by 20th',
                    'Pay any tax liability'
                ]
            };

            // Add quarterly activities
            if ([3, 6, 9, 12].includes(month)) {
                monthData.activities.push('Quarterly compliance review');
            }

            // Add annual activities
            if (month === 12) {
                monthData.activities.push('Prepare for annual return (GSTR-9)');
                monthData.activities.push('Annual compliance audit');
            }

            calendar.push(monthData);
        }

        const complianceCalendar = {
            reportType: 'GST_COMPLIANCE_CALENDAR',
            year: year,
            businessType: businessType,
            calendar: calendar,
            keyReminders: [
                'GSTR-1 due by 11th of next month',
                'GSTR-3B due by 20th of next month',
                'Annual return (GSTR-9) due by 31st December',
                'Late filing attracts penalty of ₹50 per day',
                'Interest at 18% p.a. on delayed tax payment'
            ],
            importantDates: {
                'Financial Year End': '31st March',
                'Annual Return Due': '31st December',
                'Audit Due Date': '31st December (if applicable)'
            },
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                complianceCalendar: complianceCalendar,
                summary: {
                    year: year,
                    totalMonths: 12,
                    totalDueDates: calendar.length * 2, // GSTR-1 and GSTR-3B
                    businessType: businessType
                }
            },
            message: `Compliance calendar generated for ${year}`,
            actions: [{
                type: 'compliance_calendar_generated',
                payload: {
                    year: year,
                    businessType: businessType,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate compliance calendar: ${error.message}`
        };
    }
}

// Helper functions

function determineComplianceRequirements(turnover, businessType) {
    const requirements = {
        registration: turnover > 4000000 ? 'Mandatory' : 'Optional',
        monthlyFiling: businessType === 'regular',
        quarterlyFiling: businessType === 'composition',
        annualReturn: true,
        audit: turnover > 200000000
    };

    return requirements;
}

function checkFilingCompliance(filingHistory, currentPeriod) {
    // Simplified compliance check
    return {
        onTime: filingHistory.filter(f => f.status === 'filed_on_time').length,
        delayed: filingHistory.filter(f => f.status === 'filed_late').length,
        pending: filingHistory.filter(f => f.status === 'pending').length,
        complianceRate: filingHistory.length > 0 ?
            (filingHistory.filter(f => f.status === 'filed_on_time').length / filingHistory.length * 100).toFixed(2) + '%' :
            'No data'
    };
}

function checkRegistrationCompliance(turnover, gstin) {
    return {
        registrationRequired: turnover > 4000000,
        isRegistered: !!gstin,
        compliant: turnover <= 4000000 || !!gstin
    };
}

function calculateComplianceScore(filingCompliance, registrationCompliance) {
    let score = 100;
    let criticalIssues = 0;

    // Deduct for registration non-compliance
    if (!registrationCompliance.compliant) {
        score -= 50;
        criticalIssues++;
    }

    // Deduct for filing delays
    if (filingCompliance.delayed > 0) {
        score -= Math.min(filingCompliance.delayed * 10, 30);
    }

    // Deduct for pending filings
    if (filingCompliance.pending > 0) {
        score -= Math.min(filingCompliance.pending * 15, 40);
        criticalIssues += filingCompliance.pending;
    }

    return {
        overall: Math.max(score, 0),
        filing: Math.max(100 - (filingCompliance.delayed * 10) - (filingCompliance.pending * 15), 0),
        registration: registrationCompliance.compliant ? 100 : 0,
        criticalIssues: criticalIssues
    };
}

function generateComplianceRecommendations(complianceScore, filingCompliance) {
    const recommendations = [];

    if (complianceScore.overall < 70) {
        recommendations.push('Immediate attention required for compliance improvement');
    }

    if (filingCompliance.pending > 0) {
        recommendations.push('File pending returns immediately to avoid penalties');
    }

    if (filingCompliance.delayed > 0) {
        recommendations.push('Set up reminders for timely filing');
    }

    recommendations.push('Regular compliance review and monitoring');
    recommendations.push('Maintain proper books of accounts');

    return recommendations;
}

function determineRiskLevel(complianceScore) {
    if (complianceScore.overall >= 80) return 'LOW';
    if (complianceScore.overall >= 60) return 'MEDIUM';
    return 'HIGH';
}

function generateNextActions(filingCompliance, complianceScore) {
    const actions = [];

    if (filingCompliance.pending > 0) {
        actions.push('File pending returns');
    }

    if (complianceScore.overall < 70) {
        actions.push('Review compliance gaps');
        actions.push('Consult GST advisor');
    }

    actions.push('Set up compliance monitoring');
    actions.push('Regular reconciliation of books');

    return actions;
}

function checkITCTimeLimit(invoiceDate) {
    const invoice = new Date(invoiceDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - invoice.getFullYear()) * 12 + (now.getMonth() - invoice.getMonth());

    // ITC can be claimed till the due date of filing GSTR-3B for September of next FY or filing of annual return, whichever is earlier
    return diffMonths <= 12; // Simplified check
}

function calculateEligibleITC(gstAmount, eligibilityChecks) {
    const checks = Object.values(eligibilityChecks);
    const passedChecks = checks.filter(check => check === true).length;
    const totalChecks = checks.filter(check => check !== null).length;

    // If all applicable checks pass, full ITC is eligible
    return passedChecks === totalChecks ? gstAmount : 0;
}

function getITCRestrictions(goodsOrServices, invoiceAmount) {
    const restrictions = [];

    if (goodsOrServices === 'goods' && invoiceAmount > 50000) {
        restrictions.push('Goods worth more than ₹50,000 require e-way bill');
    }

    if (goodsOrServices === 'services') {
        restrictions.push('Ensure services are actually received');
    }

    return restrictions;
}

module.exports = {
    checkGSTCompliance,
    getGSTRateRecommendations,
    checkITCEligibility,
    generateComplianceCalendar
};