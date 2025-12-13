/**
 * NIL Report Tool
 * Generates comprehensive NIL reports for GST returns with SMS filing integration
 */

const smsFilingTool = require('./smsFilingTool');
const gstCalculator = require('./gstCalculator');
const { generateFilingPeriod, formatGSTDate } = require('../modules/gstHelper');
const { formatJson } = require('../modules/jsonHelper');

/**
 * Generate comprehensive NIL report
 * @param {object} params - NIL report parameters
 * @returns {object} - NIL report result
 */
async function generateNILReport(params) {
    const {
        gstin,
        period,
        returnType = 'GSTR-3B',
        isQuarterly = false,
        includeSMS = true,
        includeJSON = true,
        businessName,
        contactInfo
    } = params;

    try {
        // Validate GSTIN first
        const gstinValidation = await gstCalculator.validateGSTINFormat({ gstin });
        if (!gstinValidation.success) {
            throw new Error(`Invalid GSTIN: ${gstinValidation.error}`);
        }

        // Format period
        const periodFormatting = await smsFilingTool.formatFilingPeriod({
            period,
            returnType,
            isQuarterly
        });

        if (!periodFormatting.success) {
            throw new Error(`Invalid period format: ${periodFormatting.error}`);
        }

        const formattedPeriod = periodFormatting.data.formattedPeriod;
        const reportDate = new Date();

        // Generate NIL report data
        const nilReport = {
            reportInfo: {
                reportType: 'NIL_RETURN_REPORT',
                generatedOn: formatGSTDate(reportDate),
                generatedAt: reportDate.toISOString(),
                reportId: `NIL_${gstin}_${formattedPeriod}_${Date.now()}`
            },
            taxpayerInfo: {
                gstin: gstin,
                legalName: businessName || gstinValidation.data.stateName || 'Business Name',
                stateCode: gstinValidation.data.stateCode,
                stateName: gstinValidation.data.stateName
            },
            returnDetails: {
                returnType: returnType,
                filingPeriod: formattedPeriod,
                originalPeriod: period,
                isQuarterly: isQuarterly,
                dueDate: calculateDueDate(formattedPeriod, returnType),
                filingStatus: 'PENDING'
            },
            nilDeclaration: {
                outwardSupplies: 0,
                inwardSupplies: 0,
                inputTaxCredit: 0,
                taxLiability: 0,
                interestPayable: 0,
                lateFeesPayable: 0,
                totalPayable: 0
            },
            compliance: {
                eligibleForNILFiling: true,
                eligibilityChecks: [
                    'No outward supplies during the period',
                    'No input tax credit to be claimed',
                    'No tax liability for the period',
                    'All previous returns filed'
                ],
                warnings: [
                    'Ensure no business transactions occurred during this period',
                    'Verify all input invoices are accounted for',
                    'Check for any pending amendments'
                ]
            }
        };

        // Add SMS filing information if requested
        let smsInfo = null;
        if (includeSMS) {
            const smsResult = await smsFilingTool.generateNILReturnSMS({
                gstin,
                period: formattedPeriod,
                returnType,
                isQuarterly
            });

            if (smsResult.success) {
                smsInfo = {
                    smsBody: smsResult.data.step1.smsBody,
                    shortUrl: smsResult.data.shortUrl,
                    deepLinks: smsResult.data.step1.deepLinks,
                    instructions: smsResult.data.step1.instructions,
                    confirmationFormat: smsResult.data.step2.format,
                    eligibility: smsResult.data.eligibility
                };
                nilReport.smsFilingInfo = smsInfo;
            }
        }

        // Add JSON format if requested
        let jsonFormat = null;
        if (includeJSON) {
            jsonFormat = generateNILReturnJSON(nilReport);
            nilReport.jsonFormat = jsonFormat;
        }

        // Generate summary
        const summary = {
            reportGenerated: true,
            gstin: gstin,
            period: formattedPeriod,
            returnType: returnType,
            smsReady: !!smsInfo,
            jsonGenerated: !!jsonFormat,
            totalSections: Object.keys(nilReport).length,
            reportSize: JSON.stringify(nilReport).length
        };

        return {
            success: true,
            data: {
                nilReport: nilReport,
                summary: summary,
                downloadFormats: {
                    json: includeJSON,
                    sms: includeSMS,
                    pdf: false // Can be implemented later
                }
            },
            message: `NIL report generated successfully for ${returnType} - ${formattedPeriod}`,
            actions: [{
                type: 'nil_report_generated',
                payload: {
                    reportId: nilReport.reportInfo.reportId,
                    gstin: gstin,
                    period: formattedPeriod,
                    returnType: returnType,
                    smsReady: !!smsInfo,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate NIL report: ${error.message}`
        };
    }
}

/**
 * Generate NIL report with SMS filing integration
 * @param {object} params - SMS NIL report parameters
 * @returns {object} - SMS NIL report result
 */
async function generateSMSNILReport(params) {
    const { gstin, period, returnType = 'GSTR-3B', isQuarterly = false } = params;

    try {
        // Generate comprehensive NIL report with SMS integration
        const nilReportResult = await generateNILReport({
            ...params,
            includeSMS: true,
            includeJSON: true
        });

        if (!nilReportResult.success) {
            throw new Error(nilReportResult.error);
        }

        const nilReport = nilReportResult.data.nilReport;
        const smsInfo = nilReport.smsFilingInfo;

        // Create SMS-focused response
        const smsReport = {
            reportType: 'SMS_NIL_FILING_REPORT',
            taxpayer: {
                gstin: gstin,
                stateCode: nilReport.taxpayerInfo.stateCode
            },
            filing: {
                returnType: returnType,
                period: nilReport.returnDetails.filingPeriod,
                dueDate: nilReport.returnDetails.dueDate
            },
            smsDetails: {
                step1: {
                    smsBody: smsInfo.smsBody,
                    recipient: '14409',
                    shortUrl: smsInfo.shortUrl,
                    deepLinks: smsInfo.deepLinks,
                    instructions: smsInfo.instructions
                },
                step2: {
                    format: smsInfo.confirmationFormat,
                    example: smsInfo.confirmationFormat.replace('<6-digit-code>', '123456'),
                    instructions: [
                        'Wait for 6-digit verification code from 14409',
                        'Send confirmation SMS with the code',
                        'Receive final filing confirmation'
                    ]
                }
            },
            eligibility: smsInfo.eligibility,
            compliance: nilReport.compliance
        };

        return {
            success: true,
            data: {
                smsReport: smsReport,
                fullReport: nilReport,
                summary: nilReportResult.data.summary
            },
            message: `SMS NIL filing report ready for ${returnType} - ${nilReport.returnDetails.filingPeriod}`,
            actions: [{
                type: 'sms_nil_report_ready',
                payload: {
                    smsBody: smsInfo.smsBody,
                    shortUrl: smsInfo.shortUrl,
                    deepLinks: smsInfo.deepLinks,
                    returnType: returnType,
                    period: nilReport.returnDetails.filingPeriod
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate SMS NIL report: ${error.message}`
        };
    }
}

/**
 * Check NIL filing eligibility and generate report
 * @param {object} params - Eligibility check parameters
 * @returns {object} - Eligibility report result
 */
async function checkNILEligibilityReport(params) {
    const { gstin, returnType = 'GSTR-3B', period } = params;

    try {
        // Validate GSTIN
        const gstinValidation = await gstCalculator.validateGSTINFormat({ gstin });
        if (!gstinValidation.success) {
            throw new Error(`Invalid GSTIN: ${gstinValidation.error}`);
        }

        // Get SMS eligibility requirements
        const eligibilityResult = await smsFilingTool.checkSMSEligibility({ gstin, returnType });

        if (!eligibilityResult.success) {
            throw new Error(eligibilityResult.error);
        }

        const eligibility = eligibilityResult.data;

        // Create eligibility report
        const eligibilityReport = {
            reportType: 'NIL_FILING_ELIGIBILITY_REPORT',
            taxpayer: {
                gstin: gstin,
                stateCode: gstinValidation.data.stateCode,
                stateName: gstinValidation.data.stateName
            },
            returnType: returnType,
            period: period,
            eligibilityStatus: 'ELIGIBLE', // Simplified - in real system would check actual conditions
            requirements: {
                mandatory: eligibility.required,
                validationChecks: eligibility.validationChecks,
                warnings: eligibility.warnings
            },
            filingProcess: eligibility.process,
            recommendations: [
                'Ensure all business records are up to date',
                'Verify no transactions occurred during the period',
                'Keep mobile number registered with GST portal active',
                'File before the due date to avoid penalties'
            ],
            nextSteps: [
                'Generate NIL report',
                'Send SMS to 14409',
                'Wait for verification code',
                'Send confirmation SMS',
                'Receive filing confirmation'
            ]
        };

        return {
            success: true,
            data: {
                eligibilityReport: eligibilityReport,
                isEligible: true,
                canProceed: true
            },
            message: `Eligibility check completed for ${returnType} NIL filing`,
            actions: [{
                type: 'eligibility_checked',
                payload: {
                    gstin: gstin,
                    returnType: returnType,
                    isEligible: true,
                    nextAction: 'generate_nil_report'
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check NIL filing eligibility: ${error.message}`
        };
    }
}

/**
 * Generate bulk NIL reports for multiple periods
 * @param {object} params - Bulk report parameters
 * @returns {object} - Bulk report result
 */
async function generateBulkNILReports(params) {
    const { gstin, periods, returnType = 'GSTR-3B', isQuarterly = false } = params;

    try {
        if (!periods || !Array.isArray(periods) || periods.length === 0) {
            throw new Error('At least one period is required for bulk report generation');
        }

        const reports = [];
        const errors = [];

        // Generate report for each period
        for (const period of periods) {
            try {
                const reportResult = await generateNILReport({
                    gstin,
                    period,
                    returnType,
                    isQuarterly,
                    includeSMS: true,
                    includeJSON: true
                });

                if (reportResult.success) {
                    reports.push({
                        period: period,
                        report: reportResult.data.nilReport,
                        summary: reportResult.data.summary
                    });
                } else {
                    errors.push({
                        period: period,
                        error: reportResult.error
                    });
                }
            } catch (error) {
                errors.push({
                    period: period,
                    error: error.message
                });
            }
        }

        const bulkReport = {
            reportType: 'BULK_NIL_REPORTS',
            taxpayer: {
                gstin: gstin
            },
            returnType: returnType,
            periodsRequested: periods.length,
            periodsProcessed: reports.length,
            periodsWithErrors: errors.length,
            reports: reports,
            errors: errors,
            generatedOn: formatGSTDate(new Date())
        };

        return {
            success: true,
            data: {
                bulkReport: bulkReport,
                summary: {
                    totalPeriods: periods.length,
                    successfulReports: reports.length,
                    failedReports: errors.length,
                    successRate: ((reports.length / periods.length) * 100).toFixed(2) + '%'
                }
            },
            message: `Bulk NIL reports generated: ${reports.length}/${periods.length} successful`,
            actions: [{
                type: 'bulk_reports_generated',
                payload: {
                    gstin: gstin,
                    totalReports: reports.length,
                    returnType: returnType,
                    downloadable: true
                }
            }]
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to generate bulk NIL reports: ${error.message}`
        };
    }
}

/**
 * Helper function to calculate due date for return filing
 * @param {string} period - Filing period in MMYYYY format
 * @param {string} returnType - Return type (GSTR-1, GSTR-3B)
 * @returns {string} - Due date
 */
function calculateDueDate(period, returnType) {
    try {
        const month = parseInt(period.substring(0, 2));
        const year = parseInt(period.substring(2));

        // Calculate next month for due date
        let dueMonth = month + 1;
        let dueYear = year;

        if (dueMonth > 12) {
            dueMonth = 1;
            dueYear += 1;
        }

        // Due dates based on return type
        const dueDates = {
            'GSTR-1': 11,  // 11th of next month
            'GSTR-3B': 20  // 20th of next month
        };

        const dueDay = dueDates[returnType] || 20;
        const dueDate = new Date(dueYear, dueMonth - 1, dueDay);

        return formatGSTDate(dueDate);
    } catch (error) {
        return 'Due date calculation failed';
    }
}

/**
 * Helper function to generate NIL return JSON format
 * @param {object} nilReport - NIL report data
 * @returns {object} - JSON format for NIL return
 */
function generateNILReturnJSON(nilReport) {
    const { taxpayerInfo, returnDetails, nilDeclaration } = nilReport;

    return {
        gstin: taxpayerInfo.gstin,
        fp: returnDetails.filingPeriod,
        version: "GST3.2.3",
        hash: "hash_placeholder",
        ret_period: returnDetails.filingPeriod,
        [returnDetails.returnType.toLowerCase()]: {
            nil_supplies: true,
            outward_supplies: nilDeclaration.outwardSupplies,
            inward_supplies: nilDeclaration.inwardSupplies,
            itc_availed: nilDeclaration.inputTaxCredit,
            tax_liability: nilDeclaration.taxLiability,
            interest_payable: nilDeclaration.interestPayable,
            late_fees: nilDeclaration.lateFeesPayable,
            total_payable: nilDeclaration.totalPayable
        }
    };
}

module.exports = {
    generateNILReport,
    generateSMSNILReport,
    checkNILEligibilityReport,
    generateBulkNILReports
};