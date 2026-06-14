/**
 * App entry point.
 *
 * For now this mounts the design-system showcase (static placeholder data, no
 * business logic). Once the Zustand stores + DI container land, this will be
 * replaced by the real navigation root (see docs/navigation.md).
 */
import React from 'react';
import { DesignSystemShowcase } from './src/examples/DesignSystemShowcase';

export default function App() {
  return <DesignSystemShowcase />;
}
