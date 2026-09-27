import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import CueEditorComponent from 'stage-cue-editor/components/cue-editor';
import type { ShowData } from 'stage-cue-editor/models/show';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

module('Unit | Component | cue-editor 分工核对', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    localStorage.clear();
  });

  test('按时间列出负责人的提示，写清场次、时刻与间隔', function (assert) {
    const component = new CueEditorComponent({}, {});
    component.assignmentKind = 'owner';
    component.assignmentKey = '李岚';

    const rows = component.assignmentRows;
    assert.strictEqual(rows.length, 2, '李岚负责两条提示');
    assert.strictEqual(rows[0]?.sceneLabel, '第一幕 S1');
    assert.strictEqual(rows[0]?.start, '19:30:00');
    assert.strictEqual(rows[0]?.end, '19:30:45');
    assert.strictEqual(rows[0]?.interval, '首条提示');
    assert.strictEqual(rows[1]?.sceneLabel, '第一幕 S2');
    assert.strictEqual(rows[1]?.start, '19:42:50');
    assert.strictEqual(rows[1]?.interval, '距上一条 12 分 5 秒');
    assert.strictEqual(component.assignmentOverlaps.length, 0, '没有重叠');
  });

  test('同一负责人时间重叠时写明哪两条、重叠多少秒', function (assert) {
    const component = new CueEditorComponent({}, {});
    const show = clone(component.show) as ShowData;
    show.scenes[1]!.startTime = '19:30';
    component.show = show;
    component.assignmentKind = 'owner';
    component.assignmentKey = '赵一帆';

    const overlaps = component.assignmentOverlaps;
    assert.strictEqual(overlaps.length, 1, '出现一组重叠');
    assert.strictEqual(overlaps[0]?.seconds, 75, '重叠 75 秒');
    assert.true(overlaps[0]?.detail.includes('说书人自左台入场'));
    assert.true(overlaps[0]?.detail.includes('群臣列队入场'));
    assert.true(overlaps[0]?.detail.includes('75 秒'), '详情写明重叠秒数');

    const rows = component.assignmentRows;
    assert.strictEqual(rows[1]?.interval, '与上一条重叠 1 分 15 秒');
    assert.true(rows[1]?.overlapPrevious);
  });

  test('道具和演员也各自列出时间清单', function (assert) {
    const component = new CueEditorComponent({}, {});

    component.assignmentKind = 'prop';
    assert.true(component.assignmentOptions.includes('月牙灯'));
    component.assignmentKey = '宫灯';
    let rows = component.assignmentRows;
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]?.title, '群臣列队入场');

    component.assignmentKind = 'cast';
    component.assignmentKey = '说书人／周启';
    rows = component.assignmentRows;
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]?.start, '19:30:45');
  });

  test('改时长、换负责人、拖动顺序或开场时间后清单跟着重算', function (assert) {
    const component = new CueEditorComponent({}, {});
    component.assignmentKind = 'owner';
    component.assignmentKey = '李岚';
    const gapBefore = component.assignmentRows[1]?.interval;

    component.selectScene('scene-1');
    component.selectCue('cue-light-1');
    component.updateSelectedField('duration', 105);
    assert.notStrictEqual(
      component.assignmentRows[1]?.interval,
      gapBefore,
      '改时长后间隔重算',
    );

    component.updateSelectedField('owner', '周启');
    assert.strictEqual(
      component.assignmentRows.length,
      1,
      '换负责人后清单重算',
    );

    component.selectScene('scene-2');
    component.updateSceneField('startTime', '19:40');
    component.selectCue('cue-light-2');
    component.moveSelected(-1);
    component.assignmentKey = '李岚';
    assert.strictEqual(
      component.assignmentRows[0]?.start,
      '19:41:00',
      '拖动顺序后时刻重算',
    );

    component.updateSceneField('startTime', '20:00');
    assert.strictEqual(
      component.assignmentRows[0]?.start,
      '20:01:00',
      '改开场时间后时刻重算',
    );
  });

  test('没指定负责人的提示照旧报空缺', function (assert) {
    const component = new CueEditorComponent({}, {});
    assert.strictEqual(component.unassignedCues.length, 1);
    assert.true(
      component.unassignedCues[0]?.label.includes('中景屏风换为朱红'),
    );
    assert.true(
      component.issues.some((issue) => issue.title === '负责人空缺'),
      '检查区继续报负责人空缺',
    );
  });
});
