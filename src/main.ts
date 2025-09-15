import { setupL10N, t } from "./libs/l10n";
import zhCN from "./translations/zhCN";

// 常量定义
const PropType = {
  JSON: 0,
  Text: 1,
  BlockRefs: 2,
  Number: 3,
  Boolean: 4,
  DateTime: 5,
  TextChoices: 6
} as const;

const RefType = {
  Inline: 1,
  Property: 2,
  RefData: 3,
  Whiteboard: 4
} as const;

let pluginName: string;
let updateInterval: number | null = null;
let blockChangeListener: any = null;

export async function load(name: string) {
  pluginName = name;

  setupL10N(orca.state.locale, { "zh-CN": zhCN });

  // 注册更新Today标签日期的命令
  orca.commands.registerCommand(
    `${pluginName}.updateTodayDates`,
    async () => {
      const updatedCount = await updateTodayDates();
      orca.commands.invokeCommand("core.notify", {
        message: t("today_dates_updated", { count: updatedCount.toString() }),
        type: "info"
      });
    },
    t("update_today_dates_command")
  );

  // 检查并更新Today标签的date属性
  await checkAndUpdateTodayTag();

  // 初始更新
  await updateTodayDates();

  // 设置定时更新（每小时更新一次）
  updateInterval = setInterval(() => {
    updateTodayDates().catch((error) => {
      console.error(t("update_error"), error);
    });
  }, 60 * 60 * 1000); // 1小时

  // 监听块变化，实时检测新添加的Today标签
  setupBlockChangeListener();

  console.log(`${pluginName} ${t("loaded_successfully")}`);
}

export async function unload() {
  // 注销命令
  orca.commands.unregisterCommand(`${pluginName}.updateTodayDates`);
  
  // 清除定时器
  if (updateInterval !== null) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  // 清除块变化监听器
  if (blockChangeListener) {
    clearInterval(blockChangeListener);
    blockChangeListener = null;
  }
}

/**
 * 检查并更新Today标签的date属性
 */
async function checkAndUpdateTodayTag() {
  try {
    console.log(`${pluginName} 检查Today标签...`);
    
    // 1. 检测Today标签是否存在
    let todayTagBlock;
    try {
      todayTagBlock = await orca.invokeBackend("get-block-by-alias", "Today");
      console.log(`找到Today标签块，ID: ${todayTagBlock.id}`);
    } catch (error) {
      console.log(`Today标签不存在，需要先创建`);
      return;
    }
    
    if (!todayTagBlock) {
      console.log(`Today标签不存在`);
      return;
    }
    
    // 2. 检查Today标签是否有date属性（类型5）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hasDateProperty = todayTagBlock.properties && 
      todayTagBlock.properties.some((prop: any) => 
        prop.name === "date" && prop.type === PropType.DateTime
      );
    
    if (!hasDateProperty) {
      console.log(`Today标签没有date属性，添加date属性`);
      // 为Today标签添加date属性
      await orca.commands.invokeEditorCommand(
        "core.editor.setProperties",
        null,
        [todayTagBlock.id],
        [{ name: "date", type: PropType.DateTime, value: today }]
      );
      console.log(`为Today标签添加date属性成功`);
    } else {
      console.log(`Today标签已有date属性，更新为今日日期`);
      // 更新Today标签的date属性为今日
      await orca.commands.invokeEditorCommand(
        "core.editor.setProperties",
        null,
        [todayTagBlock.id],
        [{ name: "date", type: PropType.DateTime, value: today }]
      );
      console.log(`更新Today标签date属性成功`);
    }
    
    // 3. 更新所有带Today标签的块的Today标签的date属性为今日
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    console.log(`找到 ${blocksWithTodayTag.length} 个带Today标签的块，开始更新Today标签的date属性`);
    console.log(`块数据:`, blocksWithTodayTag);
    
    for (const blockRef of blocksWithTodayTag) {
      const blockId = blockRef.id;
      console.log(`处理块 ${blockId}，块引用数据:`, blockRef);
      
      try {
        // 获取块的详细信息
        const block = await orca.invokeBackend("get-block", blockId);
        if (!block) {
          console.log(`块 ${blockId} 不存在，跳过`);
          continue;
        }
        
        // 找到Today标签的引用
        const todayRef = (block.refs || []).find(
          (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
        );
        
        if (todayRef) {
          console.log(`找到Today标签引用:`, todayRef);
          // 为Today标签引用设置date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            todayRef,
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          console.log(`✅ 成功更新块 ${blockId} 的Today标签date属性为今日: ${today.toISOString()}`);
        } else {
          console.log(`块 ${blockId} 没有找到Today标签引用`);
        }
      } catch (error) {
        console.error(`❌ 更新块 ${blockId} 的Today标签date属性失败:`, error);
      }
    }
    
    console.log(`${pluginName} Today标签检查完成`);
  } catch (error) {
    console.error(`${pluginName} 检查Today标签时出错:`, error);
  }
}

/**
 * 强制创建或更新date属性为日期类型
 * @param todayRef Today属性引用
 * @param today 今天的日期
 * @param blockId 块ID（用于日志）
 * @returns 是否成功
 */
async function forceCreateDateProperty(blockId: string, today: Date): Promise<boolean> {
  try {
    console.log(`强制为块 ${blockId} 创建date属性`);
    
    // 使用setProperties设置date属性
    await orca.commands.invokeEditorCommand(
      "core.editor.setProperties",
      null,
      [blockId],
      [{ 
        name: "date", 
        type: PropType.DateTime,
        value: today
      }]
    );
    
    console.log(`成功为块 ${blockId} 创建date属性`);
    return true;
  } catch (error) {
    console.error(`为块 ${blockId} 强制创建date属性失败:`, error);
    return false;
  }
}

/**
 * 更新Today标签的日期属性
 * @returns 更新的标签数量
 */
async function updateTodayDates(): Promise<number> {
  try {
    // 获取今天的日期（设置为00:00:00）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取所有带有Today标签的块
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    console.log(t("found_blocks_with_today_tag", { count: blocksWithTodayTag.length.toString() }));

    let updatedCount = 0;

    for (const blockRef of blocksWithTodayTag) {
      const blockId = blockRef.id;
      const block = await orca.invokeBackend("get-block", blockId);
      
      if (!block) {
        console.log(`块 ${blockId} 不存在，跳过`);
        continue;
      }

      console.log(`处理块 ${blockId}:`, block);

      // 查找Today标签的引用
      const todayRef = (block.refs || []).find(
        (ref: any) => ref.type === RefType.Property &&
        ref.alias === "Today"
      );

      if (!todayRef) {
        console.log(`块 ${blockId} 没有Today属性引用，尝试使用insertTag创建...`);
        
        try {
          // 先创建Today标签
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            blockId,
            "Today"
          );
          
          // 然后为块添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          console.log(`成功为块 ${blockId} 创建Today标签和date属性`);
          updatedCount++;
          continue;
        } catch (error) {
          console.error(`为块 ${blockId} 创建Today标签失败:`, error);
          continue;
        }
      }

      console.log(`找到Today引用:`, todayRef);

      // 查找date属性
      const dateProperty = (todayRef.data || []).find((prop: any) => prop.name === "date");
      
      let needsUpdate = false;
      let needsForceCreate = false;
      
      if (!dateProperty) {
        // 没有date属性，强制创建date属性
        console.log(`块 ${blockId} 没有date属性，强制创建date属性`);
        needsUpdate = true;
        needsForceCreate = true;
      } else if (dateProperty && dateProperty.type !== PropType.DateTime) {
        // date属性存在但类型不是DateTime，强制更新为DateTime类型
        console.log(`块 ${blockId} date属性类型不正确: ${dateProperty.type}，强制更新为DateTime类型`);
        needsUpdate = true;
        needsForceCreate = true;
      } else if (dateProperty && dateProperty.value instanceof Date) {
        // 检查日期是否与今天不同
        const existingDate = new Date(dateProperty.value);
        const isDifferent = existingDate.getFullYear() !== today.getFullYear() ||
                           existingDate.getMonth() !== today.getMonth() ||
                           existingDate.getDate() !== today.getDate();
        console.log(`块 ${blockId} 现有日期: ${existingDate.toISOString()}, 今天: ${today.toISOString()}, 需要更新: ${isDifferent}`);
        needsUpdate = isDifferent;
      } else if (dateProperty && !(dateProperty.value instanceof Date)) {
        // 值不是Date类型，强制更新
        console.log(`块 ${blockId} date属性值不是Date类型:`, dateProperty.value, `，强制更新为日期类型`);
        needsUpdate = true;
        needsForceCreate = true;
      }

      if (needsUpdate) {
        if (needsForceCreate) {
          // 强制创建日期类型的date属性
          const success = await forceCreateDateProperty(blockId, today);
          if (success) {
            updatedCount++;
          }
        } else {
          // 普通更新（只更新date属性的值）
          console.log(`更新块 ${blockId} 的date属性为:`, today.toISOString());
          try {
            await orca.commands.invokeEditorCommand(
              "core.editor.setProperties",
              null,
              [blockId],
              [{ 
                name: "date", 
                type: PropType.DateTime,
                value: today
              }]
            );
            updatedCount++;
            console.log(`成功更新块 ${blockId} 的date属性`);
          } catch (error) {
            console.error(`更新块 ${blockId} 时出错:`, error);
          }
        }
      } else {
        console.log(`块 ${blockId} 不需要更新`);
      }
    }

    console.log(t("today_dates_update_completed", { count: updatedCount.toString() }));
    return updatedCount;
  } catch (error) {
    console.error(t("update_error"), error);
    return 0;
  }
}

/**
 * 设置块变化监听器，实时检测新添加的Today标签
 */
function setupBlockChangeListener() {
  try {
    // 使用定时器定期检查新添加的Today标签（每30秒检查一次）
    blockChangeListener = setInterval(() => {
      checkForNewTodayTags();
    }, 30 * 1000); // 30秒检查一次
    
    console.log(`${pluginName} ${t("block_listener_setup")}`);
  } catch (error) {
    console.error(`${pluginName} 设置块变化监听器失败:`, error);
  }
}

/**
 * 检查新添加的Today标签并立即创建date属性
 */
async function checkForNewTodayTags() {
  try {
    // 获取所有带有Today标签的块
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    
    for (const blockRef of blocksWithTodayTag) {
      const blockId = blockRef.id;
      const block = await orca.invokeBackend("get-block", blockId);
      
      if (!block) continue;

      // 查找Today标签的引用
      const todayRef = (block.refs || []).find(
        (ref: any) => ref.type === RefType.Property &&
        ref.alias === "Today"
      );

      if (!todayRef) {
        // 没有Today属性引用，立即创建
        console.log(`${t("new_today_tag_detected")}: 块 ${blockId}`);
        try {
          // 先创建Today标签
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            blockId,
            "Today"
          );
          
          // 重新获取块数据以获取Today引用
          const updatedBlock = await orca.invokeBackend("get-block", blockId);
          const newTodayRef = (updatedBlock.refs || []).find(
            (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
          );
          
          if (newTodayRef) {
            // 1. 为Today标签的引用添加date数据
            await orca.commands.invokeEditorCommand(
              "core.editor.setRefData",
              null,
              newTodayRef,
              [{ name: "date", type: PropType.DateTime, value: new Date() }]
            );
            console.log(`为Today标签引用添加date数据成功: 块 ${blockId}`);
          }
          
          // 2. 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: new Date() }]
          );
          
          console.log(`成功为Today标签创建date属性: 块 ${blockId}`);
          console.log(`${t("real_time_creation_success")}: 块 ${blockId}`);
        } catch (error) {
          console.error(`${t("real_time_creation_failed")}: 块 ${blockId}`, error);
        }
        continue;
      }

      // 检查是否有date属性
      const dateProperty = (todayRef.data || []).find((prop: any) => prop.name === "date");
      
      if (!dateProperty) {
        // 有Today属性引用但没有date属性，立即创建date属性
        console.log(`${t("today_tag_missing_date")}: 块 ${blockId}`);
        try {
          // 1. 为Today标签的引用添加date数据
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            todayRef,
            [{ name: "date", type: PropType.DateTime, value: new Date() }]
          );
          console.log(`为Today标签引用添加date数据成功: 块 ${blockId}`);
          
          // 2. 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: new Date() }]
          );
          console.log(`为块添加date属性成功: 块 ${blockId}`);
        } catch (error) {
          console.error(`${t("real_time_creation_failed")}: 块 ${blockId}`, error);
        }
      }
    }
  } catch (error) {
    console.error(`${pluginName} 检查新Today标签时出错:`, error);
  }
}
