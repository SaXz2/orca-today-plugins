let $ = "en", k = {};
function v(e, a) {
  $ = e, k = a;
}
function l(e, a, t) {
  var o;
  const i = ((o = k[t ?? $]) == null ? void 0 : o[e]) ?? e;
  return a == null ? i : Object.entries(a).reduce(
    (d, [n, r]) => d.replaceAll(`\${${n}}`, r),
    i
  );
}
const w = {
  update_today_dates_command: "更新Today标签的日期属性",
  today_dates_updated: "Today标签日期更新完成，更新了 ${count} 个标签",
  found_blocks_with_today_tag: "找到 ${count} 个带有Today标签的块",
  today_dates_update_completed: "Today标签日期更新完成，更新了 ${count} 个标签",
  update_error: "更新Today标签日期时出错:",
  loaded_successfully: "已加载完成",
  block_listener_setup: "块变化监听器已设置",
  new_today_tag_detected: "检测到新Today标签，立即创建date属性",
  today_tag_missing_date: "检测到Today标签缺少date属性，立即创建",
  real_time_creation_success: "成功为新Today标签创建date属性",
  real_time_creation_failed: "为新Today标签创建date属性失败"
}, s = {
  JSON: 0,
  Text: 1,
  BlockRefs: 2,
  Number: 3,
  Boolean: 4,
  DateTime: 5,
  TextChoices: 6
}, f = {
  Inline: 1,
  Property: 2,
  RefData: 3,
  Whiteboard: 4
};
let u, g = null, T = null;
async function P(e) {
  u = e, v(orca.state.locale, { "zh-CN": w }), orca.commands.registerCommand(
    `${u}.updateTodayDates`,
    async () => {
      const a = await p();
      orca.commands.invokeCommand("core.notify", {
        message: l("today_dates_updated", { count: a.toString() }),
        type: "info"
      });
    },
    l("update_today_dates_command")
  ), await D(), await p(), g = setInterval(() => {
    p().catch((a) => {
      console.error(l("update_error"), a);
    });
  }, 60 * 60 * 1e3), b(), console.log(`${u} ${l("loaded_successfully")}`);
}
async function B() {
  orca.commands.unregisterCommand(`${u}.updateTodayDates`), g !== null && (clearInterval(g), g = null), T && (clearInterval(T), T = null);
}
async function D() {
  try {
    console.log(`${u} 检查Today标签...`);
    let e;
    try {
      e = await orca.invokeBackend("get-block-by-alias", "Today"), console.log(`找到Today标签块，ID: ${e.id}`);
    } catch {
      console.log("Today标签不存在，需要先创建");
      return;
    }
    if (!e) {
      console.log("Today标签不存在");
      return;
    }
    const a = /* @__PURE__ */ new Date();
    a.setHours(0, 0, 0, 0), e.properties && e.properties.some(
      (o) => o.name === "date" && o.type === s.DateTime
    ) ? (console.log("Today标签已有date属性，更新为今日日期"), await orca.commands.invokeEditorCommand(
      "core.editor.setProperties",
      null,
      [e.id],
      [{ name: "date", type: s.DateTime, value: a }]
    ), console.log("更新Today标签date属性成功")) : (console.log("Today标签没有date属性，添加date属性"), await orca.commands.invokeEditorCommand(
      "core.editor.setProperties",
      null,
      [e.id],
      [{ name: "date", type: s.DateTime, value: a }]
    ), console.log("为Today标签添加date属性成功"));
    const i = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    console.log(`找到 ${i.length} 个带Today标签的块，开始更新Today标签的date属性`), console.log("块数据:", i);
    for (const o of i) {
      const d = o.id;
      console.log(`处理块 ${d}，块引用数据:`, o);
      try {
        const n = await orca.invokeBackend("get-block", d);
        if (!n) {
          console.log(`块 ${d} 不存在，跳过`);
          continue;
        }
        const r = (n.refs || []).find(
          (y) => y.type === f.Property && y.alias === "Today"
        );
        r ? (console.log("找到Today标签引用:", r), await orca.commands.invokeEditorCommand(
          "core.editor.setRefData",
          null,
          r,
          [{ name: "date", type: s.DateTime, value: a }]
        ), console.log(`✅ 成功更新块 ${d} 的Today标签date属性为今日: ${a.toISOString()}`)) : console.log(`块 ${d} 没有找到Today标签引用`);
      } catch (n) {
        console.error(`❌ 更新块 ${d} 的Today标签date属性失败:`, n);
      }
    }
    console.log(`${u} Today标签检查完成`);
  } catch (e) {
    console.error(`${u} 检查Today标签时出错:`, e);
  }
}
async function h(e, a) {
  try {
    return console.log(`强制为块 ${e} 创建date属性`), await orca.commands.invokeEditorCommand(
      "core.editor.setProperties",
      null,
      [e],
      [{
        name: "date",
        type: s.DateTime,
        value: a
      }]
    ), console.log(`成功为块 ${e} 创建date属性`), !0;
  } catch (t) {
    return console.error(`为块 ${e} 强制创建date属性失败:`, t), !1;
  }
}
async function p() {
  try {
    const e = /* @__PURE__ */ new Date();
    e.setHours(0, 0, 0, 0);
    const a = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    console.log(l("found_blocks_with_today_tag", { count: a.length.toString() }));
    let t = 0;
    for (const i of a) {
      const o = i.id, d = await orca.invokeBackend("get-block", o);
      if (!d) {
        console.log(`块 ${o} 不存在，跳过`);
        continue;
      }
      console.log(`处理块 ${o}:`, d);
      const n = (d.refs || []).find(
        (c) => c.type === f.Property && c.alias === "Today"
      );
      if (!n) {
        console.log(`块 ${o} 没有Today属性引用，尝试使用insertTag创建...`);
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            o,
            "Today"
          ), await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [o],
            [{ name: "date", type: s.DateTime, value: e }]
          ), console.log(`成功为块 ${o} 创建Today标签和date属性`), t++;
          continue;
        } catch (c) {
          console.error(`为块 ${o} 创建Today标签失败:`, c);
          continue;
        }
      }
      console.log("找到Today引用:", n);
      const r = (n.data || []).find((c) => c.name === "date");
      let y = !1, m = !1;
      if (!r)
        console.log(`块 ${o} 没有date属性，强制创建date属性`), y = !0, m = !0;
      else if (r && r.type !== s.DateTime)
        console.log(`块 ${o} date属性类型不正确: ${r.type}，强制更新为DateTime类型`), y = !0, m = !0;
      else if (r && r.value instanceof Date) {
        const c = new Date(r.value), _ = c.getFullYear() !== e.getFullYear() || c.getMonth() !== e.getMonth() || c.getDate() !== e.getDate();
        console.log(`块 ${o} 现有日期: ${c.toISOString()}, 今天: ${e.toISOString()}, 需要更新: ${_}`), y = _;
      } else r && !(r.value instanceof Date) && (console.log(`块 ${o} date属性值不是Date类型:`, r.value, "，强制更新为日期类型"), y = !0, m = !0);
      if (y)
        if (m)
          await h(o, e) && t++;
        else {
          console.log(`更新块 ${o} 的date属性为:`, e.toISOString());
          try {
            await orca.commands.invokeEditorCommand(
              "core.editor.setProperties",
              null,
              [o],
              [{
                name: "date",
                type: s.DateTime,
                value: e
              }]
            ), t++, console.log(`成功更新块 ${o} 的date属性`);
          } catch (c) {
            console.error(`更新块 ${o} 时出错:`, c);
          }
        }
      else
        console.log(`块 ${o} 不需要更新`);
    }
    return console.log(l("today_dates_update_completed", { count: t.toString() })), t;
  } catch (e) {
    return console.error(l("update_error"), e), 0;
  }
}
function b() {
  try {
    T = setInterval(() => {
      C();
    }, 30 * 1e3), console.log(`${u} ${l("block_listener_setup")}`);
  } catch (e) {
    console.error(`${u} 设置块变化监听器失败:`, e);
  }
}
async function C() {
  try {
    const e = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    for (const a of e) {
      const t = a.id, i = await orca.invokeBackend("get-block", t);
      if (!i) continue;
      const o = (i.refs || []).find(
        (n) => n.type === f.Property && n.alias === "Today"
      );
      if (!o) {
        console.log(`${l("new_today_tag_detected")}: 块 ${t}`);
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            t,
            "Today"
          );
          const r = ((await orca.invokeBackend("get-block", t)).refs || []).find(
            (y) => y.type === f.Property && y.alias === "Today"
          );
          r && (await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            r,
            [{ name: "date", type: s.DateTime, value: /* @__PURE__ */ new Date() }]
          ), console.log(`为Today标签引用添加date数据成功: 块 ${t}`)), await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [t],
            [{ name: "date", type: s.DateTime, value: /* @__PURE__ */ new Date() }]
          ), console.log(`成功为Today标签创建date属性: 块 ${t}`), console.log(`${l("real_time_creation_success")}: 块 ${t}`);
        } catch (n) {
          console.error(`${l("real_time_creation_failed")}: 块 ${t}`, n);
        }
        continue;
      }
      if (!(o.data || []).find((n) => n.name === "date")) {
        console.log(`${l("today_tag_missing_date")}: 块 ${t}`);
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            o,
            [{ name: "date", type: s.DateTime, value: /* @__PURE__ */ new Date() }]
          ), console.log(`为Today标签引用添加date数据成功: 块 ${t}`), await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [t],
            [{ name: "date", type: s.DateTime, value: /* @__PURE__ */ new Date() }]
          ), console.log(`为块添加date属性成功: 块 ${t}`);
        } catch (n) {
          console.error(`${l("real_time_creation_failed")}: 块 ${t}`, n);
        }
      }
    }
  } catch (e) {
    console.error(`${u} 检查新Today标签时出错:`, e);
  }
}
export {
  P as load,
  B as unload
};
