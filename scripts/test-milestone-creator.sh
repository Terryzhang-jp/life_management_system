#!/bin/bash

# Milestone Creator测试脚本
# 模拟完整的用户交互流程

API_URL="http://localhost:3001/api/milestone-creator"

echo "========================================="
echo "Milestone Creator - 第1轮测试"
echo "========================================="
echo ""

# 初始请求：用户说"我想创建一个milestone，发第一篇paper"
echo "👤 用户: 我想创建一个milestone，发第一篇paper"
echo ""

RESPONSE_1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我想创建一个milestone，发第一篇paper",
    "history": [],
    "context": {}
  }')

echo "🤖 AI响应:"
echo "$RESPONSE_1" | jq -r '.response.question.main // .error // "No response"'
echo ""

if echo "$RESPONSE_1" | jq -e '.response.question.options' > /dev/null 2>&1; then
  echo "📋 选项:"
  echo "$RESPONSE_1" | jq -r '.response.question.options[] | "  - \(.label)"'
  echo ""
fi

if echo "$RESPONSE_1" | jq -e '.response.sidebar.observation' > /dev/null 2>&1; then
  echo "💭 AI观察:"
  echo "$RESPONSE_1" | jq -r '.response.sidebar.observation'
  echo ""
fi

echo "========================================="
echo "按Enter继续第2轮..."
read

# 第2轮：用户选择"paper"
echo "👤 用户选择: paper"
echo ""

RESPONSE_2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我选择paper",
    "history": [
      {"role": "user", "content": "我想创建一个milestone，发第一篇paper"},
      {"role": "assistant", "content": "'"$(echo "$RESPONSE_1" | jq -c '.response')"'"}
    ],
    "context": {
      "type": "paper"
    }
  }')

echo "🤖 AI响应:"
echo "$RESPONSE_2" | jq -r '.response.question.main // .error // "No response"'
echo ""

if echo "$RESPONSE_2" | jq -e '.response.question.options' > /dev/null 2>&1; then
  echo "📋 选项:"
  echo "$RESPONSE_2" | jq -r '.response.question.options[] | "  - \(.label)"'
  echo ""
fi

if echo "$RESPONSE_2" | jq -e '.response.sidebar.observation' > /dev/null 2>&1; then
  echo "💭 AI观察:"
  echo "$RESPONSE_2" | jq -r '.response.sidebar.observation'
  echo ""
fi

echo "========================================="
echo "按Enter继续第3轮..."
read

# 第3轮：用户选择"ready"（准备执行）
echo "👤 用户选择: 有想法，准备开始执行"
echo ""

RESPONSE_3=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "有想法，准备开始执行",
    "history": [
      {"role": "user", "content": "我想创建一个milestone，发第一篇paper"},
      {"role": "assistant", "content": "'"$(echo "$RESPONSE_1" | jq -c '.response')"'"},
      {"role": "user", "content": "我选择paper"},
      {"role": "assistant", "content": "'"$(echo "$RESPONSE_2" | jq -c '.response')"'"}
    ],
    "context": {
      "type": "paper",
      "stage": "ready"
    }
  }')

echo "🤖 AI响应:"
echo "$RESPONSE_3" | jq -r '.response.question.main // .error // "No response"'
echo ""

if echo "$RESPONSE_3" | jq -e '.response.sidebar.observation' > /dev/null 2>&1; then
  echo "💭 AI观察:"
  echo "$RESPONSE_3" | jq -r '.response.sidebar.observation'
  echo ""
fi

echo "========================================="
echo "按Enter继续第4轮..."
read

# 第4轮：用户描述核心贡献
echo "👤 用户: 提出了一种新的HCI交互范式，提升老年人智能手机使用效率30%"
echo ""

RESPONSE_4=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "提出了一种新的HCI交互范式，提升老年人智能手机使用效率30%",
    "history": [],
    "context": {
      "type": "paper",
      "stage": "ready",
      "contribution": "提出了一种新的HCI交互范式，提升老年人智能手机使用效率30%"
    }
  }')

echo "🤖 AI响应:"
echo "$RESPONSE_4" | jq -r '.response.question.main // .error // "No response"'
echo ""

if echo "$RESPONSE_4" | jq -e '.response.question.options' > /dev/null 2>&1; then
  echo "📋 选项:"
  echo "$RESPONSE_4" | jq -r '.response.question.options[] | "  - \(.label) \(.note // "")"'
  echo ""
fi

if echo "$RESPONSE_4" | jq -e '.response.sidebar.observation' > /dev/null 2>&1; then
  echo "💭 AI观察:"
  echo "$RESPONSE_4" | jq -r '.response.sidebar.observation'
  echo ""
fi

echo "========================================="
echo "测试完成！"
echo ""
echo "💡 观察要点："
echo "1. AI是否能识别milestone类型？"
echo "2. 问题是否针对性强，避免无用问题？"
echo "3. Sidebar观察是否基于前面的context？"
echo "4. 问题顺序是否合理？"
echo ""
echo "详细日志已保存在上面的JSON输出中。"
