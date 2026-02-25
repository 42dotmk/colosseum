#!/bin/bash

# Seed Sample Data for Colosseum
# Based on API spec from http://localhost:1337/documentation/v1.0.0

BASE_URL="http://localhost:1337/api"

# Check if API_TOKEN is provided as environment variable
if [ -z "$API_TOKEN" ]; then
  echo "⚠️  No API_TOKEN found. Attempting to use admin credentials..."
  
  # Prompt for admin credentials
  read -p "Enter admin email (or press Enter to use default 'admin@colosseum.local'): " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@colosseum.local"}
  
  read -sp "Enter admin password: " ADMIN_PASSWORD
  echo ""
  
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ Password is required!"
    exit 1
  fi
  
  # Login to get JWT token
  echo "🔐 Authenticating..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/local" \
    -H "Content-Type: application/json" \
    -d "{
      \"identifier\": \"$ADMIN_EMAIL\",
      \"password\": \"$ADMIN_PASSWORD\"
    }")
  
  JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.jwt')
  
  if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
    echo "❌ Authentication failed!"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "💡 Alternatively, create an API token in Strapi admin panel:"
    echo "   Settings -> API Tokens -> Create new API Token"
    echo "   Then run: API_TOKEN=your_token_here $0"
    exit 1
  fi
  
  AUTH_HEADER="Authorization: Bearer $JWT_TOKEN"
  echo "✅ Authenticated successfully!"
else
  AUTH_HEADER="Authorization: Bearer $API_TOKEN"
  echo "✅ Using provided API_TOKEN"
fi

echo "🌱 Seeding sample data for Colosseum..."

# 1. Create Languages
echo "📝 Creating Languages..."

PYTHON_ID=$(curl -s -X POST "$BASE_URL/languages" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "name": "Python",
      "codeName": "python",
      "entrypoint": "main.py",
      "defaultMaxCpuTime": 10.0,
      "defaultMaxMemory": 512
    }
  }' | jq -r '.data.id')

echo "Created Python language (ID: $PYTHON_ID)"

JAVASCRIPT_ID=$(curl -s -X POST "$BASE_URL/languages" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "name": "JavaScript (Node.js)",
      "codeName": "nodejs",
      "entrypoint": "index.js",
      "defaultMaxCpuTime": 10.0,
      "defaultMaxMemory": 512
    }
  }' | jq -r '.data.id')

echo "Created JavaScript language (ID: $JAVASCRIPT_ID)"

JAVA_ID=$(curl -s -X POST "$BASE_URL/languages" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "name": "Java",
      "codeName": "java",
      "entrypoint": "Main.java",
      "defaultMaxCpuTime": 15.0,
      "defaultMaxMemory": 1024
    }
  }' | jq -r '.data.id')

echo "Created Java language (ID: $JAVA_ID)"

CSHARP_ID=$(curl -s -X POST "$BASE_URL/languages" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "name": "C#",
      "codeName": "csharp",
      "entrypoint": "Program.cs",
      "defaultMaxCpuTime": 15.0,
      "defaultMaxMemory": 1024
    }
  }' | jq -r '.data.id')

echo "Created C# language (ID: $CSHARP_ID)"

# 2. Create a Problem
echo "📝 Creating Problem: Two Sum..."

PROBLEM_ID=$(curl -s -X POST "$BASE_URL/problems" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "Two Sum",
      "slug": "two-sum",
      "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n## Example 1\n\n**Input:** nums = [2,7,11,15], target = 9\n\n**Output:** [0,1]\n\n**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].\n\n## Example 2\n\n**Input:** nums = [3,2,4], target = 6\n\n**Output:** [1,2]\n\n## Example 3\n\n**Input:** nums = [3,3], target = 6\n\n**Output:** [0,1]\n\n## Constraints\n\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9\n- Only one valid answer exists.",
      "starterCodes": [
        {
          "language": '$PYTHON_ID',
          "code": "def two_sum(nums, target):\n    # Your code here\n    pass\n\nif __name__ == \"__main__\":\n    import sys\n    import json\n    \n    line = sys.stdin.readline().strip()\n    data = json.loads(line)\n    nums = data[\"nums\"]\n    target = data[\"target\"]\n    \n    result = two_sum(nums, target)\n    print(json.dumps(result))"
        },
        {
          "language": '$JAVASCRIPT_ID',
          "code": "function twoSum(nums, target) {\n    // Your code here\n}\n\nconst readline = require(\"readline\");\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nrl.on(\"line\", (line) => {\n    const data = JSON.parse(line);\n    const result = twoSum(data.nums, data.target);\n    console.log(JSON.stringify(result));\n    rl.close();\n});"
        }
      ]
    }
  }' | jq -r '.data.id')

echo "Created problem (ID: $PROBLEM_ID)"

# 3. Create Test Cases for the Problem
echo "📝 Creating Test Cases..."

TC1_ID=$(curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM_ID',
      "input": "{\"nums\": [2, 7, 11, 15], \"target\": 9}",
      "output": "[0, 1]",
      "hidden": false,
      "locked": false,
      "weight": 1.0,
      "explanation": "nums[0] + nums[1] = 2 + 7 = 9"
    }
  }' | jq -r '.data.id')

echo "Created test case 1 (ID: $TC1_ID)"

TC2_ID=$(curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM_ID',
      "input": "{\"nums\": [3, 2, 4], \"target\": 6}",
      "output": "[1, 2]",
      "hidden": false,
      "locked": false,
      "weight": 1.0,
      "explanation": "nums[1] + nums[2] = 2 + 4 = 6"
    }
  }' | jq -r '.data.id')

echo "Created test case 2 (ID: $TC2_ID)"

TC3_ID=$(curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM_ID',
      "input": "{\"nums\": [3, 3], \"target\": 6}",
      "output": "[0, 1]",
      "hidden": false,
      "locked": false,
      "weight": 1.0,
      "explanation": "nums[0] + nums[1] = 3 + 3 = 6"
    }
  }' | jq -r '.data.id')

echo "Created test case 3 (ID: $TC3_ID)"

TC4_ID=$(curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM_ID',
      "input": "{\"nums\": [-1, -2, -3, -4, -5], \"target\": -8}",
      "output": "[2, 4]",
      "hidden": true,
      "locked": false,
      "weight": 2.0,
      "explanation": "nums[2] + nums[4] = -3 + -5 = -8 (Hidden test case)"
    }
  }' | jq -r '.data.id')

echo "Created hidden test case 4 (ID: $TC4_ID)"

# 4. Create Multiple Events (covering different scenarios)
echo "📝 Creating Events..."

# Event 1: Past Event (ended yesterday)
PAST_START=$(date -u -v-7d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "-7 days" +"%Y-%m-%dT%H:%M:%S.000Z")
PAST_END=$(date -u -v-1d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "-1 day" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT1_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "January Warmup Challenge 2026",
      "slug": "january-warmup-2026",
      "description": "# January Warmup Challenge 2026\n\n🎉 **EVENT CONCLUDED** - Thank you to all 247 participants!\n\n## Overview\nOur January warmup challenge kicked off the new year with the classic **Two Sum** problem. This event was designed to help developers shake off the holiday rust and get back into competitive programming mode.\n\n## Final Results\n- **Total Submissions:** 612\n- **Successful Solutions:** 189\n- **Average Completion Time:** 8.4 minutes\n- **Fastest Solution:** 2m 34s by @speedcoder_\n\n## Problem Highlights\nParticipants tackled the Two Sum problem, a fundamental array manipulation challenge that tests understanding of hash maps and algorithmic efficiency. Solutions ranged from O(n²) brute force to optimal O(n) implementations.\n\n## Top Performing Languages\n1. Python - 45% of submissions\n2. JavaScript - 28% of submissions\n3. Java - 18% of submissions\n4. C# - 9% of submissions\n\n## What We Learned\nMany participants initially struggled with edge cases involving negative numbers and duplicate values. The hidden test case (negative integers) caught 23% of solutions off guard!\n\n---\n\n*Stay tuned for our next challenge!*",
      "start": "'$PAST_START'",
      "end": "'$PAST_END'",
      "problem": '$PROBLEM_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID', '$JAVA_ID', '$CSHARP_ID']
    }
  }' | jq -r '.data.id')

echo "Created past event (ID: $EVENT1_ID)"

# Event 2: Active Event (started yesterday, ends in 6 days)
ACTIVE_START=$(date -u -v-1d +"%Y-%m-%dT09:00:00.000Z" 2>/dev/null || date -u -d "-1 day 09:00" +"%Y-%m-%dT%H:%M:%S.000Z")
ACTIVE_END=$(date -u -v+6d +"%Y-%m-%dT23:59:59.000Z" 2>/dev/null || date -u -d "+6 days 23:59" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT2_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "Weekly Challenge #1 - Two Sum Showdown",
      "slug": "weekly-challenge-1",
      "description": "# 🔥 Weekly Challenge #1: Two Sum Showdown\n\n**STATUS: LIVE NOW** | Ends in 6 days\n\n## The Challenge\nWelcome to our inaugural weekly coding challenge! Your mission: solve the classic **Two Sum** problem efficiently and elegantly.\n\n## Problem Description\nGiven an array of integers and a target sum, find two numbers that add up to the target. Sounds simple? The devil is in the details!\n\n## Scoring System\n- ✅ **All test cases pass:** 100 points\n- 🏃 **Execution time bonus:** Up to 50 points\n  - Under 50ms: +50 pts\n  - 50-100ms: +25 pts\n  - 100-200ms: +10 pts\n- 💾 **Memory efficiency bonus:** Up to 25 points\n  - Under 10MB: +25 pts\n  - 10-20MB: +15 pts\n- 🎯 **First submission bonus:** +25 points\n\n## Rules & Guidelines\n1. Submit in any supported language (Python, JavaScript, Java, C#)\n2. Your solution must handle all test cases including hidden ones\n3. Focus on both correctness AND efficiency\n4. Code readability matters - we review top solutions!\n\n## Tips for Success\n💡 **Hint:** Think about using a hash map for O(n) time complexity\n💡 **Watch out:** Handle edge cases like duplicate numbers\n💡 **Pro tip:** Test with negative numbers before submitting\n\n## Current Leaderboard\n1. 🥇 @algorithm_ace - 175 pts (Python, 23ms)\n2. 🥈 @code_ninja - 168 pts (JavaScript, 31ms)\n3. 🥉 @java_master - 165 pts (Java, 45ms)\n\n## Prize Pool\n🏆 **1st Place:** $100 gift card + Featured profile\n🥈 **2nd Place:** $50 gift card\n🥉 **3rd Place:** $25 gift card\n\n*All participants who pass all test cases receive a completion badge!*\n\n---\n\n**Ready to compete? Submit your solution now!**",
      "start": "'$ACTIVE_START'",
      "end": "'$ACTIVE_END'",
      "problem": '$PROBLEM_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID', '$JAVA_ID', '$CSHARP_ID']
    }
  }' | jq -r '.data.id')

echo "Created active event (ID: $EVENT2_ID)"

# Event 3: Future Event (starts in 7 days, ends in 14 days)
FUTURE_START=$(date -u -v+7d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%S.000Z")
FUTURE_END=$(date -u -v+14d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+14 days" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT3_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "Weekly Challenge #2: Array Masters",
      "slug": "weekly-challenge-2",
      "description": "# 📅 Weekly Challenge #2: Array Masters\n\n**STATUS: REGISTRATION OPEN** | Starts in 7 days\n\n## What to Expect\nBuilding on the success of Challenge #1, we'"'"'re back with another array manipulation problem that will test your algorithmic thinking. This time, we'"'"'re focusing on the **Two Sum** problem with enhanced test cases and stricter performance requirements.\n\n## New This Week\n- 🆕 Expanded test suite with 12 test cases (8 visible, 4 hidden)\n- ⚡ Stricter time limits: 30ms for optimal performance bonus\n- 🎯 Special bonus for multi-language submissions\n- 📊 Real-time leaderboard updates\n\n## Event Schedule\n- **Registration Opens:** Now!\n- **Event Starts:** In 7 days\n- **Duration:** 7 days\n- **Results Announced:** 14 days from now\n\n## Enhanced Scoring\nBased on feedback from Challenge #1, we'"'"'ve refined our scoring system:\n\n### Base Points (100 pts)\n- Pass all visible test cases: 60 pts\n- Pass all hidden test cases: 40 pts\n\n### Performance Bonuses (75 pts)\n- ⚡ Lightning fast (under 30ms): +50 pts\n- 🏃 Fast (30-60ms): +30 pts\n- 👍 Good (60-100ms): +15 pts\n\n### Special Achievements (50 pts)\n- 🌟 Multi-language master (submit in 2+ languages): +30 pts\n- 🎯 Perfect first try (no resubmissions): +20 pts\n- 💬 Helpful community member (assist others in discussion): +15 pts\n\n## Prize Pool\nIncreased rewards for Challenge #2!\n\n🏆 **1st Place:** $200 + Exclusive winner badge + LinkedIn shoutout\n🥈 **2nd Place:** $125 + Silver badge\n🥉 **3rd Place:** $75 + Bronze badge\n🎖️ **Top 10:** Special recognition in our monthly newsletter\n🎁 **All Finishers:** Completion badge + 10% off our premium course\n\n---\n\n**See you at the starting line! 🏁**",
      "start": "'$FUTURE_START'",
      "end": "'$FUTURE_END'",
      "problem": '$PROBLEM_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID', '$JAVA_ID', '$CSHARP_ID']
    }
  }' | jq -r '.data.id')

echo "Created future event (ID: $EVENT3_ID)"

# Event 4: Python-Only Sprint (starts tomorrow, 3 days)
PY_START=$(date -u -v+1d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%S.000Z")
PY_END=$(date -u -v+4d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+4 days" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT4_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "🐍 Python Sprint Weekend: Pythonic Excellence",
      "slug": "python-sprint-weekend",
      "description": "# 🐍 Python Sprint Weekend\n\n**Exclusive Python-Only Event** | Starts Tomorrow | 72 Hours\n\n## For the Python Community\n\nCalling all Pythonistas! This special weekend sprint is dedicated exclusively to Python developers. Whether you'"'"'re a beginner learning list comprehensions or a veteran wielding decorators and generators, this event celebrates the elegance and power of Python.\n\n## The Challenge: Pythonic Two Sum\n\nSolve the classic Two Sum problem, but here'"'"'s the twist: **we'"'"'re judging on Python best practices and idioms!**\n\n### What Makes a Solution \"Pythonic\"?\n- ✨ Clean, readable code following PEP 8\n- 🎯 Appropriate use of Python data structures (dict, set, etc.)\n- 🚀 Leveraging Python'"'"'s built-in functions\n- 📝 Clear variable names and documentation\n- 🔧 Type hints (bonus points!)\n\n## Judging Criteria\n\n### Technical Excellence (100 pts)\n- ✅ Correctness: All tests pass (40 pts)\n- ⚡ Performance: Time complexity O(n) or better (30 pts)\n- 💾 Memory efficiency (15 pts)\n- 🏃 Execution speed (15 pts)\n\n### Pythonic Style (50 pts)\n- 📖 PEP 8 compliance (15 pts)\n- 🎨 Idiomatic Python patterns (15 pts)\n- 💬 Code documentation and clarity (10 pts)\n- 🔤 Type annotations (10 pts)\n\n### Special Categories\n- 🏆 **Most Elegant Solution:** Voted by community\n- 🎓 **Best Beginner Solution:** For those with <6 months Python experience\n- 🚀 **Most Creative Approach:** Thinking outside the box\n\n## Prizes & Recognition\n\n### Main Track\n🥇 **1st Place:** $150 + Python Masters badge + PyCharm 1-year license\n🥈 **2nd Place:** $100 + Featured solution write-up\n🥉 **3rd Place:** $50 + Community spotlight\n\n### Special Awards\n🌟 **Most Elegant:** $75 + \"Pythonic Excellence\" badge\n🎓 **Best Beginner:** Free Python course (worth $199)\n🚀 **Most Creative:** Python swag pack\n\n## Why Join?\n\n✅ **Sharpen Your Skills:** Practice makes perfect\n✅ **Network:** Connect with fellow Python enthusiasts\n✅ **Learn:** Expert feedback on your code\n✅ **Compete:** Test yourself against the community\n✅ **Win:** Prizes and recognition\n✅ **Have Fun:** It'"'"'s a sprint, not a marathon!\n\n---\n\n**Remember:** In Python, we value clarity over cleverness, but both are celebrated here! 🐍✨\n\n*Let'"'"'s write some beautiful Python code together!*",
      "start": "'$PY_START'",
      "end": "'$PY_END'",
      "problem": '$PROBLEM_ID',
      "supportedLanguages": ['$PYTHON_ID']
    }
  }' | jq -r '.data.id')

echo "Created Python-only event (ID: $EVENT4_ID)"

# 5. Create another Problem (Palindrome)
echo "📝 Creating Problem: Valid Palindrome..."

PROBLEM2_ID=$(curl -s -X POST "$BASE_URL/problems" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "Valid Palindrome",
      "slug": "valid-palindrome",
      "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.\n\n## Example 1\n\n**Input:** s = \"A man, a plan, a canal: Panama\"\n\n**Output:** true\n\n**Explanation:** \"amanaplanacanalpanama\" is a palindrome.\n\n## Example 2\n\n**Input:** s = \"race a car\"\n\n**Output:** false\n\n**Explanation:** \"raceacar\" is not a palindrome.\n\n## Example 3\n\n**Input:** s = \" \"\n\n**Output:** true\n\n**Explanation:** s is an empty string \"\" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome.\n\n## Constraints\n\n- 1 <= s.length <= 2 * 10^5\n- s consists only of printable ASCII characters.",
      "starterCodes": [
        {
          "language": '$PYTHON_ID',
          "code": "def is_palindrome(s):\n    # Your code here\n    pass\n\nif __name__ == \"__main__\":\n    import sys\n    import json\n    \n    line = sys.stdin.readline().strip()\n    data = json.loads(line)\n    s = data[\"s\"]\n    \n    result = is_palindrome(s)\n    print(json.dumps(result))"
        },
        {
          "language": '$JAVASCRIPT_ID',
          "code": "function isPalindrome(s) {\n    // Your code here\n}\n\nconst readline = require(\"readline\");\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nrl.on(\"line\", (line) => {\n    const data = JSON.parse(line);\n    const result = isPalindrome(data.s);\n    console.log(JSON.stringify(result));\n    rl.close();\n});"
        }
      ]
    }
  }' | jq -r '.data.id')

echo "Created problem 2 (ID: $PROBLEM2_ID)"

# Create test cases for palindrome
echo "📝 Creating Test Cases for Palindrome..."

curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM2_ID',
      "input": "{\"s\": \"A man, a plan, a canal: Panama\"}",
      "output": "true",
      "hidden": false,
      "locked": false,
      "weight": 1.0
    }
  }' > /dev/null

curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM2_ID',
      "input": "{\"s\": \"race a car\"}",
      "output": "false",
      "hidden": false,
      "locked": false,
      "weight": 1.0
    }
  }' > /dev/null

curl -s -X POST "$BASE_URL/test-cases" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "problem": '$PROBLEM2_ID',
      "input": "{\"s\": \" \"}",
      "output": "true",
      "hidden": false,
      "locked": false,
      "weight": 1.0
    }
  }' > /dev/null

echo "Created test cases for palindrome problem"

# 6. Create More Events with Palindrome Problem
echo "📝 Creating more events..."

# Event 5: Monthly Contest - February 2026 (Palindrome, starts in 14 days)
MONTHLY_START=$(date -u -v+14d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+14 days" +"%Y-%m-%dT%H:%M:%S.000Z")
MONTHLY_END=$(date -u -v+21d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+21 days" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT5_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "Monthly Contest - February 2026",
      "slug": "monthly-contest-feb-2026",
      "description": "# 🏆 Monthly Contest - February 2026\n\n**Theme: String Manipulation Masters**\n\n## Event Overview\nWelcome to our February Monthly Contest! This month, we'"'"'re diving deep into string manipulation with the **Valid Palindrome** problem. Test your skills against hundreds of competitors from around the world.\n\n## The Challenge\nA phrase is a palindrome if it reads the same forward and backward after removing all non-alphanumeric characters. Your task: determine if a given string is a valid palindrome.\n\n## Why This Problem?\nString manipulation is fundamental to:\n- 📱 Text processing and validation\n- 🔐 Password strength checking\n- 🔍 Search algorithms\n- 🌐 Natural language processing\n\nMaster this, and you'"'"'re one step closer to coding mastery!\n\n## Competition Format\n\n### Duration\n- **Starts:** February 8, 2026\n- **Ends:** February 15, 2026\n- **Duration:** 7 days\n- **Submissions:** Unlimited\n\n### Scoring Breakdown\n- **Correctness (100 pts):** All test cases must pass\n- **Speed Bonus (50 pts):** Based on execution time\n- **Code Quality (25 pts):** Readability and best practices\n- **Early Bird (25 pts):** Submit in first 24 hours\n\n## Languages\nThis contest supports:\n- 🐍 Python\n- 📜 JavaScript (Node.js)\n\nChoose the language you'"'"'re most comfortable with!\n\n## Prizes\n\n### Grand Prize Winners\n🥇 **1st Place:** $500 cash + Trophy badge + Featured interview\n🥈 **2nd Place:** $300 cash + Silver trophy\n🥉 **3rd Place:** $200 cash + Bronze trophy\n\n### Category Winners\n🐍 **Best Python Solution:** $100\n📜 **Best JavaScript Solution:** $100\n⚡ **Fastest Solution:** $75\n👥 **Community Choice:** $50 (voted by participants)\n\n### All Participants\n- Monthly Contest badge\n- Detailed performance analytics\n- Access to winning solutions (post-contest)\n- Certificate of participation\n\n## Test Cases\nYour solution will be tested against:\n- 3 visible test cases (shown before submission)\n- 5 hidden test cases (revealed after contest)\n- Edge cases including:\n  - Empty strings\n  - Single characters\n  - Special characters and spaces\n  - Very long strings (10,000+ characters)\n\n## Preparation Resources\n\n### Recommended Study Topics\n- String manipulation techniques\n- Character classification methods\n- Two-pointer algorithms\n- Time/space complexity optimization\n\n### Practice Problems\nWarm up with these similar challenges:\n1. Reverse String\n2. Valid Anagram\n3. Longest Palindromic Substring\n\n## Rules & Fair Play\n\n✅ **Allowed:**\n- Standard library functions\n- Multiple submissions (best one counts)\n- Researching algorithms and approaches\n\n❌ **Not Allowed:**\n- Copying solutions from others\n- Using AI code generators during contest\n- Multiple accounts\n- Sharing solutions before contest ends\n\n## Leaderboard\nReal-time leaderboard updates every 5 minutes!\n- See your ranking\n- Track your progress\n- Compare with friends\n- Anonymous mode available\n\n## Community\nJoin our community channels:\n- 💬 Discord: Live chat during contest\n- 📧 Newsletter: Weekly tips and tricks\n- 🐦 Twitter: Real-time updates\n- 📱 Mobile app: Submit on the go\n\n## Past Winners Say\n\n> \"The monthly contests are the perfect blend of challenge and learning. I improved my string algorithm skills significantly!\" - @developer_alex\n\n> \"Fair judging, great prizes, and an awesome community. What more could you ask for?\" - @code_enthusiast\n\n## Important Dates\n- **Feb 1:** Registration opens\n- **Feb 7:** Pre-contest Q&A session\n- **Feb 8:** Contest begins!\n- **Feb 15:** Submissions close at 23:59 UTC\n- **Feb 16:** Winners announced\n- **Feb 17:** Solution explanations published\n\n## Technical Specifications\n- **Time Limit:** 5 seconds per test case\n- **Memory Limit:** 256 MB\n- **Input Format:** JSON string\n- **Output Format:** JSON boolean\n\n---\n\n## Ready to Compete?\n\nMark your calendar and prepare to showcase your string manipulation skills. May the best solution win!\n\n**See you in the arena! 🎯**",
      "start": "'$MONTHLY_START'",
      "end": "'$MONTHLY_END'",
      "problem": '$PROBLEM2_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID']
    }
  }' | jq -r '.data.id')

echo "Created monthly contest (ID: $EVENT5_ID)"

# Event 6: Long-Duration Marathon (Palindrome, starts in 3 days, lasts 30 days)
MARATHON_START=$(date -u -v+3d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+3 days" +"%Y-%m-%dT%H:%M:%S.000Z")
MARATHON_END=$(date -u -v+33d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+33 days" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT6_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "🏃 30-Day Coding Marathon",
      "slug": "30-day-marathon",
      "description": "# 🏃 30-Day Coding Marathon\n\n**Extended Challenge: Code at Your Own Pace**\n\n## Welcome to the Marathon!\n\nNot everyone can dedicate a weekend to coding challenges. That'"'"'s why we created the 30-Day Coding Marathon - a month-long event where you can solve problems on YOUR schedule.\n\n## What Makes This Different?\n\nUnlike our sprint events, the Marathon is designed for:\n- 👔 Working professionals with busy schedules\n- 🎓 Students juggling coursework\n- 🌍 International participants across time zones\n- 🐢 Anyone who prefers thoughtful, paced problem-solving\n\n## The Challenge: Valid Palindrome\n\nThis month'"'"'s marathon features the **Valid Palindrome** problem - a classic string manipulation challenge that'"'"'s perfect for:\n- Learning string processing\n- Practicing algorithm optimization\n- Understanding time/space complexity tradeoffs\n\n## Marathon Structure\n\n### Phase 1: Learning (Days 1-10)\n- 📚 Study materials released\n- 🎥 Video tutorials available\n- 💬 Weekly live Q&A sessions\n- 🤝 Form study groups\n\n### Phase 2: Coding (Days 11-25)\n- 💻 Start coding your solution\n- 📊 Track your progress\n- 🔄 Submit multiple iterations\n- 📈 See your improvement over time\n\n### Phase 3: Optimization (Days 26-30)\n- ⚡ Refine your solution\n- 🎯 Optimize for performance\n- ✨ Improve code quality\n- 🏁 Final submission\n\n## Flexible Scoring\n\nWe understand everyone has different goals:\n\n### Completion Track (Beginner-Friendly)\n- ✅ Pass all test cases: 100 pts\n- 📝 Code documentation: +20 pts\n- 🎓 Learning journal submission: +30 pts\n\n### Performance Track (Intermediate)\n- ⚡ Fast execution: up to 50 pts\n- 💾 Memory efficiency: up to 25 pts\n- 📊 Multiple language submissions: +40 pts\n\n### Excellence Track (Advanced)\n- 🎨 Code elegance: up to 50 pts\n- 🧪 Additional test cases submitted: +25 pts\n- 📖 Tutorial/blog post: +75 pts\n- 🤝 Mentoring other participants: +50 pts\n\n## Prizes & Rewards\n\n### Top 3 Overall\n🥇 **1st Place:** $400 + Marathon Champion badge + 1-year premium membership\n🥈 **2nd Place:** $250 + Silver Marathon badge + 6-month premium\n🥉 **3rd Place:** $150 + Bronze Marathon badge + 3-month premium\n\n### Track Winners\n🎓 **Completion Track Winner:** $100 + Learning Champion badge\n⚡ **Performance Track Winner:** $150 + Speed Demon badge\n🎨 **Excellence Track Winner:** $200 + Code Artist badge\n\n### Special Recognition\n- 📈 **Most Improved:** $100 (based on submission progression)\n- 🤝 **Community Hero:** $100 (most helpful participant)\n- 🌟 **Perfect Attendance:** $50 (participated in all Q&A sessions)\n\n### Milestone Badges\nEarn badges as you progress:\n- 🎯 First Submission\n- 🏃 Week 1 Complete\n- 💪 Halfway Hero\n- 🔥 Week 3 Warrior\n- 🏁 Marathon Finisher\n- ⭐ All Tests Passed\n- 🚀 Optimized Solution\n\n## Learning Resources\n\nWe'"'"'ve got you covered with comprehensive learning materials:\n\n### Video Content\n- 🎥 Problem walkthrough (15 mins)\n- 🎥 Algorithm explanation (20 mins)\n- 🎥 Python solution guide (25 mins)\n- 🎥 JavaScript solution guide (25 mins)\n- 🎥 Optimization techniques (30 mins)\n\n### Written Guides\n- 📖 Beginner'"'"'s guide to string manipulation\n- 📖 Character classification techniques\n- 📖 Two-pointer algorithm explained\n- 📖 Time complexity analysis\n- 📖 Common pitfalls and how to avoid them\n\n### Interactive Support\n- 💬 24/7 Discord channel\n- 📧 Email mentoring (response within 24h)\n- 🎤 Weekly live coding sessions\n- 👥 Peer code review (optional)\n\n## Weekly Schedule\n\n### Week 1: Foundation\n- Mon: Kickoff event & problem introduction\n- Wed: String manipulation basics\n- Fri: Q&A session #1\n\n### Week 2: Development\n- Mon: Algorithm design session\n- Wed: Code review workshop\n- Fri: Q&A session #2\n\n### Week 3: Refinement\n- Mon: Optimization techniques\n- Wed: Performance tuning\n- Fri: Q&A session #3\n\n### Week 4: Excellence\n- Mon: Code quality best practices\n- Wed: Final polish workshop\n- Fri: Q&A session #4\n- Sun: Final submission deadline\n\n### Week 5: Celebration\n- Mon: Results announcement\n- Wed: Winners showcase\n- Fri: Reflection & feedback\n\n## Community Features\n\n### Study Groups\nJoin or create study groups:\n- 🌅 Early Birds (morning coders)\n- 🌙 Night Owls (evening coders)\n- 🌍 Time Zone specific groups\n- 💼 Working Professionals\n- 🎓 Students\n\n### Progress Sharing\n- Share your journey on social media\n- Weekly progress check-ins\n- Celebrate milestones together\n- Optional anonymous leaderboard\n\n### Networking\n- Connect with 500+ participants\n- Build your professional network\n- Find coding buddies\n- Discover mentorship opportunities\n\n## Technical Details\n\n### Supported Languages\n- 🐍 Python 3.11+\n- 📜 JavaScript (Node.js 20+)\n- ☕ Java 17+\n- #️⃣ C# .NET 8+\n\n### Environment Specs\n- **Time Limit:** 10 seconds per test\n- **Memory Limit:** 256 MB\n- **Submission Limit:** Unlimited\n- **Test Cases:** 8 total (3 visible, 5 hidden)\n\n## Success Stories\n\n> \"I completed my first coding challenge ever during the Marathon! The paced approach helped me learn without feeling overwhelmed.\" - @firsttime_coder\n\n> \"As a full-time parent, the 30-day format was perfect. I could code during nap times!\" - @coding_parent\n\n> \"The learning resources were exceptional. I not only solved the problem but understood WHY my solution worked.\" - @curious_developer\n\n## Rules & Guidelines\n\n### Academic Integrity\n- ✅ Learn from resources and tutorials\n- ✅ Discuss approaches (without sharing code)\n- ✅ Ask for help when stuck\n- ❌ Copy solutions from others\n- ❌ Share your code before deadline\n- ❌ Use multiple accounts\n\n### Respectful Community\n- Be supportive and encouraging\n- Help others learn (without giving answers)\n- Celebrate everyone'"'"'s progress\n- Report violations privately\n\n## FAQs\n\n**Q: Can I submit multiple times?**\nA: Yes! We encourage iterative improvement.\n\n**Q: Do I need to participate every day?**\nA: No! Code on your schedule. We recommend at least weekly progress.\n\n**Q: What if I get stuck?**\nA: Ask in Discord, attend Q&A sessions, or request email mentoring.\n\n**Q: Can I switch languages mid-marathon?**\nA: Absolutely! Each language submission is tracked separately.\n\n**Q: Is this beginner-friendly?**\nA: Yes! We have tracks for all skill levels.\n\n---\n\n## Join the Marathon!\n\nThis is more than a coding challenge - it'"'"'s a month-long learning journey with a supportive community. Whether you'"'"'re a beginner taking your first steps or an expert refining your craft, there'"'"'s a place for you here.\n\n**Remember: It'"'"'s not about how fast you code, it'"'"'s about how far you'"'"'ve come! 🎯**\n\n*Registration is open. Start your journey today!*",
      "start": "'$MARATHON_START'",
      "end": "'$MARATHON_END'",
      "problem": '$PROBLEM2_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID', '$JAVA_ID', '$CSHARP_ID']
    }
  }' | jq -r '.data.id')

echo "Created marathon event (ID: $EVENT6_ID)"

# Event 7: Beginner-Friendly (Two Sum, active, started 2 days ago, ends in 5 days)
BEGINNER_START=$(date -u -v-2d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "-2 days" +"%Y-%m-%dT%H:%M:%S.000Z")
BEGINNER_END=$(date -u -v+5d +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -d "+5 days" +"%Y-%m-%dT%H:%M:%S.000Z")

EVENT7_ID=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "data": {
      "title": "👋 Beginner Bootcamp - Welcome to Coding!",
      "slug": "beginner-bootcamp",
      "description": "# 👋 Beginner Bootcamp: Your First Coding Challenge\n\n**CURRENTLY ACTIVE** | Perfect for Newcomers | All Skill Levels Welcome\n\n## Welcome, New Coder!\n\nIs this your first coding challenge? Feeling nervous? Don'"'"'t be! The Beginner Bootcamp is specifically designed for people who are new to competitive programming or just starting their coding journey.\n\n## What Makes This Beginner-Friendly?\n\n### 🎓 Learning-First Approach\n- Clear, detailed explanations\n- No prior competition experience needed\n- Helpful hints and tips provided\n- Supportive community of learners\n- Dedicated mentors available\n\n### 📚 Complete Learning Path\nWe'"'"'ve structured this bootcamp to teach you step-by-step:\n1. Understanding the problem\n2. Breaking it down into smaller parts\n3. Choosing the right data structure\n4. Writing clean, working code\n5. Testing your solution\n6. Optimizing if time allows\n\n## The Challenge: Two Sum\n\nWe'"'"'ve chosen the **Two Sum** problem because it'"'"'s:\n- ✅ Easy to understand\n- ✅ Teaches fundamental concepts\n- ✅ Used in real coding interviews\n- ✅ Has multiple solution approaches\n- ✅ Great for learning about algorithms\n\n### Problem in Plain English\n\"Given a list of numbers and a target, find two numbers that add up to the target.\"\n\nThat'"'"'s it! Simple concept, but you'"'"'ll learn so much solving it.\n\n## How We Support You\n\n### 🎯 Guided Learning\n**Step 1: Understanding (Day 1-2)**\n- Watch our problem walkthrough video\n- Read the detailed explanation\n- Study the example cases\n- Ask questions in our Q&A forum\n\n**Step 2: Planning (Day 2-3)**\n- Learn about hash maps/dictionaries\n- Understand time complexity basics\n- Sketch your solution on paper\n- Join our planning workshop\n\n**Step 3: Coding (Day 3-5)**\n- Start with a simple solution\n- Test with provided examples\n- Don'"'"'t worry about optimization yet\n- Get help if you'"'"'re stuck\n\n**Step 4: Testing (Day 5-6)**\n- Run against all visible test cases\n- Handle edge cases\n- Fix any bugs\n- Attend debugging workshop\n\n**Step 5: Submitting (Day 6-7)**\n- Review your code one more time\n- Submit your solution!\n- Celebrate your achievement 🎉\n\n### 💬 Mentorship Program\nEvery participant gets:\n- Assigned mentor for the week\n- 30-minute 1-on-1 session (optional)\n- Code review feedback\n- Encouragement and guidance\n\n### 📺 Video Tutorials\n**Beginner Series:**\n- \"What is Two Sum?\" (10 mins)\n- \"Arrays and Lists Basics\" (15 mins)\n- \"Introduction to Hash Maps\" (20 mins)\n- \"Writing Your First Solution\" (30 mins)\n- \"Testing and Debugging\" (15 mins)\n\n**Language-Specific Guides:**\n- 🐍 Python for Beginners (25 mins)\n- 📜 JavaScript Basics (25 mins)\n- ☕ Java Fundamentals (30 mins)\n- #️⃣ C# Introduction (30 mins)\n\n### 📖 Written Resources\n- Beginner'"'"'s guide to competitive programming\n- How to read problem statements\n- Basic algorithm patterns\n- Debugging techniques for beginners\n- Common mistakes and how to avoid them\n\n## Beginner-Friendly Scoring\n\nWe focus on learning, not just winning:\n\n### Completion Awards (Everyone Can Achieve!)\n- ✅ Attempted submission: 25 pts\n- ✅ Passed sample tests: 50 pts\n- ✅ Passed all tests: 100 pts\n- 📚 Watched tutorials: +10 pts\n- 🤝 Helped another beginner: +15 pts\n- 💬 Active in community: +10 pts\n\n### Learning Bonuses\n- 📝 Submitted learning reflection: +20 pts\n- 🔄 Multiple attempts (shows persistence): +10 pts\n- ❓ Asked thoughtful questions: +5 pts\n\n### No Penalties!\n- ❌ No penalty for multiple submissions\n- ❌ No penalty for slower solutions\n- ❌ No penalty for taking the full week\n\n## Beginner Prizes\n\n### Everyone Gets:\n- 🎖️ Beginner Bootcamp completion badge\n- 📜 Certificate of participation\n- 🎁 Welcome kit with learning resources\n- 🔓 Unlock intermediate challenges\n\n### Top Beginners:\n🥇 **Most Improved:** $75 + Growth Champion badge\n🥈 **Best First Solution:** $50 + First Try badge\n🥉 **Most Helpful:** $25 + Community Star badge\n\n### Random Draws:\n- 🎲 5 random finishers get $20 each\n- 🎲 All participants entered to win 1-year premium\n\n## Safe Learning Environment\n\n### Our Commitments:\n- ✅ No question is too basic\n- ✅ Mistakes are learning opportunities\n- ✅ Everyone is here to help\n- ✅ Be patient with yourself\n- ✅ Progress over perfection\n\n### Community Guidelines:\n- Be kind and supportive\n- Share knowledge, not solutions\n- Celebrate small wins\n- Ask for help when needed\n- Help others when you can\n\n## Real Beginner Stories\n\n> \"I thought competitive programming was only for geniuses. This bootcamp showed me anyone can learn! I solved my first problem!\" - @newbie_coder\n\n> \"The mentorship made all the difference. My mentor was patient and explained everything clearly.\" - @learning_to_code\n\n> \"I failed my first two submissions, but the community encouraged me to keep trying. I passed on my third try!\" - @persistent_learner\n\n## Common Beginner Worries\n\n**😰 \"I'"'"'m not smart enough\"**\n→ Coding is a learned skill, not innate talent. Everyone starts somewhere!\n\n**😰 \"Everyone else is faster\"**\n→ Speed comes with practice. Focus on understanding, not racing.\n\n**😰 \"What if I can'"'"'t solve it?\"**\n→ We'"'"'ll help you! Plus, attempting is success in itself.\n\n**😰 \"I don'"'"'t know enough yet\"**\n→ This bootcamp teaches you what you need to know.\n\n**😰 \"I'"'"'ll embarrass myself\"**\n→ This is a judgment-free zone. We'"'"'ve all been beginners!\n\n## Technical Details (Don'"'"'t Worry, We'"'"'ll Explain!)\n\n### Languages You Can Use:\n- 🐍 Python (recommended for beginners)\n- 📜 JavaScript\n- ☕ Java\n- #️⃣ C#\n\n### What You'"'"'ll Need:\n- Basic understanding of variables and loops\n- Ability to write simple functions\n- That'"'"'s it! We'"'"'ll teach the rest.\n\n## Schedule\n\n### Daily Live Sessions (All Times UTC)\n- **10:00 AM:** Morning workshop (Americas-friendly)\n- **18:00 PM:** Evening workshop (Asia/Europe-friendly)\n- **Available 24/7:** Discord help channel\n\n### Special Events\n- **Day 1:** Welcome orientation\n- **Day 3:** Mid-week check-in\n- **Day 5:** Debugging clinic\n- **Day 7:** Celebration & reflection\n\n## After the Bootcamp\n\nCompleting this bootcamp unlocks:\n- 🔓 Intermediate challenges\n- 🔓 Advanced learning resources  \n- 🔓 Alumni community\n- 🔓 Future bootcamp mentor opportunity\n\n## Ready to Start?\n\nRemember:\n- 🎯 Focus on learning, not winning\n- 🤝 Ask questions freely\n- 🔄 Multiple attempts are encouraged\n- 🎉 Celebrate small victories\n- 💪 You'"'"'ve got this!\n\n---\n\n## Your Coding Journey Starts Here!\n\nEvery expert was once a beginner. This could be the start of an amazing journey in programming. We'"'"'re excited to support you every step of the way.\n\n**Take the first step. Submit your first solution. Join us! 🚀**\n\n*P.S. Feeling nervous is normal. Feeling excited is even better. You belong here!*",
      "start": "'$BEGINNER_START'",
      "end": "'$BEGINNER_END'",
      "problem": '$PROBLEM_ID',
      "supportedLanguages": ['$PYTHON_ID', '$JAVASCRIPT_ID', '$JAVA_ID', '$CSHARP_ID']
    }
  }' | jq -r '.data.id')

echo "Created beginner event (ID: $EVENT7_ID)"

echo ""
echo "✅ Sample data seeding complete!"
echo ""
echo "📊 Summary:"
echo "  - Languages: 4 (Python, JavaScript, Java, C#)"
echo "  - Problems: 2 (Two Sum, Valid Palindrome)"
echo "  - Test Cases: 7 total (3 visible + 1 hidden for Two Sum, 3 for Palindrome)"
echo "  - Events: 7 covering diverse scenarios:"
echo "    ✓ Past event (ended)"
echo "    ✓ 2 Active events (currently running)"
echo "    ✓ Future events (not started)"
echo "    ✓ Python-only event"
echo "    ✓ Long-duration marathon (30 days)"
echo "    ✓ Beginner-friendly event"
echo ""
echo "Event Status Breakdown:"
echo "  - PAST: January Warmup Challenge"
echo "  - ACTIVE: Weekly Challenge #1, Beginner Bootcamp"
echo "  - FUTURE (starts soon): Python Sprint Weekend, Weekly Challenge #2"
echo "  - FUTURE (starts later): Monthly Contest Feb 2026, 30-Day Marathon"
echo ""
echo "🌐 View your events at: http://localhost:3000"
echo "🔧 Admin panel: http://localhost:1337/admin"
