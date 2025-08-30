import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

test('detects completed user when using ObjectId comparison', () => {
    const userId = new mongoose.Types.ObjectId();
    const chapter = { completedBy: [userId] };

    // Ensure direct includes fails with mixed types
    assert.strictEqual(chapter.completedBy.includes(userId.toString()), false);

    // Correct detection using toString comparison
    const detected = chapter.completedBy.some(id => id.toString() === userId.toString());
    assert.strictEqual(detected, true);
});
