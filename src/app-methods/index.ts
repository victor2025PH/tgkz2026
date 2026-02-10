/**
 * 🔧 Phase 9-1b: Business Method Mixins
 *
 * Merges domain-specific methods into AppComponent.prototype at module load.
 * This reduces AppComponent file size by ~5,700 lines while preserving all functionality.
 *
 * Pattern: Each file defines a mixin class, exports its property descriptors,
 * which are then applied to AppComponent.prototype via Object.defineProperties.
 */
import { resource_methods_descriptors } from './resource-methods';
import { member_methods_descriptors } from './member-methods';
import { knowledge_voice_methods_descriptors } from './knowledge-voice-methods';
import { campaign_batch_methods_descriptors } from './campaign-batch-methods';
import { member_extract_methods_descriptors } from './member-extract-methods';

/**
 * Apply all method mixins to a target class prototype.
 * Call this once at module level: applyMethodMixins(AppComponent);
 */
export function applyMethodMixins(targetClass: any): void {
  const mixins = [
    resource_methods_descriptors,
    member_methods_descriptors,
    knowledge_voice_methods_descriptors,
    campaign_batch_methods_descriptors,
    member_extract_methods_descriptors,
  ];

  for (const descriptors of mixins) {
    // Skip 'constructor' to avoid overriding the target class constructor
    const { constructor, ...methods } = descriptors;
    Object.defineProperties(targetClass.prototype, methods);
  }
}
