import AsyncStorage from '@react-native-async-storage/async-storage';

interface ERPConfig {
  salesforce?: {
    endpoint: string;
    token: string;
  };
  sap?: {
    endpoint: string;
    token: string;
  };
  dynamics?: {
    endpoint: string;
    token: string;
  };
}

const DEFAULT_CONFIG: ERPConfig = {
  salesforce: {
    endpoint: process.env.SALESFORCE_ENDPOINT || 'https://shadowcorps.my.salesforce.com',
    token: process.env.SALESFORCE_TOKEN || '',
  },
  sap: {
    endpoint: process.env.SAP_ENDPOINT || 'https://api.sap.shadowcorps.net',
    token: process.env.SAP_TOKEN || '',
  },
  dynamics: {
    endpoint: process.env.DYNAMICS_ENDPOINT || 'https://api.dynamics.com',
    token: process.env.DYNAMICS_TOKEN || '',
  },
};

export const pushToERP = async (
  report: any,
  system: 'salesforce' | 'sap' | 'dynamics'
): Promise<{ success: boolean; erpId?: string; error?: string }> => {
  const config = DEFAULT_CONFIG[system];
  
  if (!config || !config.token) {
    console.warn(`ERP ${system} not configured, queuing for later`);
    await queueERPReport(report, system);
    return { success: false, error: 'Not configured' };
  }

  try {
    const endpoint = getEndpoint(system, report);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-DTA-Verified': 'true',
      },
      body: JSON.stringify({
        ...report,
        sovereignSource: 'FieldCommander_v4.0',
        verifiedAt: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`ERP push failed: ${response.status}`);
    }

    const result = await response.json();
    console.log(`🔗 Report pushed to ${system}:`, result.id || 'queued');

    return { success: true, erpId: result.id };
  } catch (error) {
    console.error(`Failed to push to ${system}:`, error);
    await queueERPReport(report, system);
    return { success: false, error: String(error) };
  }
};

const getEndpoint = (system: string, report: any): string => {
  const baseEndpoints = {
    salesforce: '/services/data/v60.0/sobjects/Inspection__c',
    sap: '/odata/Inspection',
    dynamics: '/api/data/v9.2/shadow_inspections',
  };

  return `${DEFAULT_CONFIG[system as keyof ERPConfig]?.endpoint}${baseEndpoints[system as keyof typeof baseEndpoints]}`;
};

const queueERPReport = async (
  report: any,
  system: 'salesforce' | 'sap' | 'dynamics'
): Promise<void> => {
  const queue = JSON.parse((await AsyncStorage.getItem('erp_queue')) || '[]');
  queue.push({ report, system, timestamp: Date.now() });
  await AsyncStorage.setItem('erp_queue', JSON.stringify(queue));
  console.log(`📦 ERP report queued for ${system}`);
};

export const processERPQueue = async (): Promise<number> => {
  const queue = JSON.parse((await AsyncStorage.getItem('erp_queue')) || '[]');
  
  if (queue.length === 0) return 0;

  console.log(`📤 Processing ${queue.length} queued ERP reports...`);
  
  let processed = 0;
  const remaining: any[] = [];

  for (const item of queue) {
    const result = await pushToERP(item.report, item.system);
    
    if (result.success) {
      processed++;
    } else {
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem('erp_queue', JSON.stringify(remaining));
  return processed;
};

export const pushMagicMomentToERP = async (
  momentData: any,
  dtaToken: string
): Promise<void> => {
  const report = {
    missionId: momentData.missionId,
    timestamp: momentData.timestamp,
    duration: momentData.duration,
    dtaToken,
    anchorCount: momentData.spatialAnchors?.length || 0,
    hasDualAngle: momentData.dualAngle,
    sensors: momentData.sensors,
    verifiedAt: Date.now(),
    sovereignSource: 'FieldCommander_v4.0',
  };

  await Promise.allSettled([
    pushToERP(report, 'salesforce'),
    pushToERP(report, 'sap'),
    pushToERP(report, 'dynamics'),
  ]);
};

export const pushDefectReportToERP = async (
  report: any,
  dtaToken: string
): Promise<void> => {
  const erpReport = {
    ...report,
    dtaToken,
    verifiedAt: Date.now(),
    sovereignSource: 'FieldCommander_v4.0',
    reportType: 'AI_DEFECT_DETECTION',
  };

  await Promise.allSettled([
    pushToERP(erpReport, 'salesforce'),
    pushToERP(erpReport, 'sap'),
    pushToERP(erpReport, 'dynamics'),
  ]);
};

export const getERPQueueStatus = async (): Promise<{
  queued: number;
  lastProcessed: number | null;
}> => {
  const queue = JSON.parse((await AsyncStorage.getItem('erp_queue')) || '[]');
  return {
    queued: queue.length,
    lastProcessed: null,
  };
};

export const updateERPConfig = async (
  system: 'salesforce' | 'sap' | 'dynamics',
  config: { endpoint: string; token: string }
): Promise<void> => {
  const key = `erp_${system}`;
  await AsyncStorage.setItem(key, JSON.stringify(config));
  console.log(`🔐 ERP ${system} configuration updated`);
};
