#!/usr/bin/env node

import { processElicitationResponse, validateElicitationResponse } from './index.js';

async function run() {
  console.error('Running mock elicitation client tests...');

  const planSchema = {
    type: 'object',
    properties: {
      decision: { type: 'string', enum: ['approve', 'request_revision'] },
      feedback: { type: 'string' },
    },
    required: ['decision'],
  };

  console.error('\nTest 1: Valid accept response');
  const resp1 = processElicitationResponse('accept', { decision: 'approve', feedback: 'Looks good' }, planSchema);
  console.error('Result:', resp1);

  console.error('\nTest 2: Invalid accept response (missing required)');
  const resp2 = processElicitationResponse('accept', { feedback: 'Missing decision field' }, planSchema);
  console.error('Result:', resp2);

  console.error('\nTest 3: Decline response');
  const resp3 = processElicitationResponse('decline', undefined, planSchema);
  console.error('Result:', resp3);

  console.error('\nTest 4: Cancel response');
  const resp4 = processElicitationResponse('cancel', undefined, planSchema);
  console.error('Result:', resp4);

  console.error('\nValidation helper test (enum mismatch)');
  const val = validateElicitationResponse({ decision: 'nope' }, planSchema);
  console.error('Validation:', val);
}

run().catch((e) => {
  console.error('Mock client error:', e);
  process.exit(1);
});
