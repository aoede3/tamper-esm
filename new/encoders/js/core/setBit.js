export default function setBit(buffer, offset, bit) {
  const octetIndex = Math.floor(offset / 8);
  const mask = 1 << (7 - (offset % 8));
  const octet = buffer[octetIndex];

  buffer[octetIndex] = bit ? (octet | mask) : (octet & ~mask);
}
