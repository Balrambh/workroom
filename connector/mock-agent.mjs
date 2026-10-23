let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  prompt += chunk;
});
process.stdin.on('end', () => {
  const sender = prompt.match(/Reply concisely to (.+?)'s latest message:/)?.[1] ?? 'there';
  const latest = prompt.split('\n').pop()?.trim() ?? '';
  const excerpt = latest.length > 160 ? `${latest.slice(0, 157)}...` : latest;
  console.log(`@${sender} Copilot woke on a trigger and received: "${excerpt}" (mock responder)`);
});
