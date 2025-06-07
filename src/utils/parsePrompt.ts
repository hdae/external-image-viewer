// 生成されたTypeScriptコード
export type TagToken = {
    type: "tag"
    content: string
}

export type LoraToken = {
    type: "lora"
    content: string
    weight?: number
}

export type GroupToken = {
    type: "group"
    content: PromptToken[]
    weight?: number
}

export type BreakToken = {
    type: "break"
    content: "BREAK"
}

/**
 * プロンプト内の個々のトークンを表す型。
 * タグ、LORA、グループ、BREAKの種類がある。
 * グループの場合、contentはPromptTokenの配列であり、ネストされた構造を持つ。
 */
export type PromptToken = TagToken | LoraToken | GroupToken | BreakToken

/**
 * パースされたプロンプトの型。
 * BREAKで区切られたセクションの配列で、各セクションはPromptTokenの配列である。
 */
export type ParsedPrompt = PromptToken[][]

/**
 * LORAタグの正規表現パターン。
 * 例: `<lora:model_name:0.7>`
 */
const LORA_PATTERN = /^<lora:([^:>]+):(\d*\.?\d+)>|^<lora:([^:>]+)>/

/**
 * 重み付き表現の重み部分の正規表現パターン。
 * 例: `text:0.7`
 */
const WEIGHT_PATTERN = /^(.*): *(\d*\.?\d+)$/

/**
 * プロンプト文字列をトークンの配列にパースするメイン関数。
 *
 * @param prompt パースするStable Diffusionプロンプト文字列。
 * @returns パースされたプロンプトトークンの二次元配列。
 */
export const parseStableDiffusionPrompt = (prompt: string): ParsedPrompt => {
    // プロンプトを"BREAK"キーワードでセクションに分割
    const rawSections = prompt.split("BREAK")

    // 各セクションをパースし、BREAKトークンを適切に挿入
    return rawSections.map((section, index) => {
        const parsedTokens = parseSection(section.trim())
        if (index === 0) {
            return parsedTokens.length === 0 &&
                rawSections.length > 1 &&
                section.trim() === ""
                ? []
                : parsedTokens
        } else {
            const breakToken: BreakToken = { type: "break", content: "BREAK" }
            return [breakToken, ...parsedTokens]
        }
    })
}

/**
 * 単一のプロンプトセクション文字列をPromptTokenの配列にパースする。
 *
 * @param sectionText パースするセクション文字列。
 * @returns パースされたPromptTokenの配列。
 */
const parseSection = (sectionText: string): PromptToken[] => {
    const tokens: PromptToken[] = []
    let currentIndex = 0

    while (currentIndex < sectionText.length) {
        const skippedIndex = skipWhitespaceAndCommas(sectionText, currentIndex)
        if (skippedIndex === sectionText.length) break
        currentIndex = skippedIndex

        const loraResult = parseLoraTag(sectionText, currentIndex)
        if (loraResult) {
            tokens.push(loraResult.token)
            currentIndex = loraResult.nextIndex
            continue
        }

        const groupResult = parseGroupExpression(sectionText, currentIndex)
        if (groupResult) {
            tokens.push(groupResult.token)
            currentIndex = groupResult.nextIndex
            continue
        }

        const tagResult = parseRegularTag(sectionText, currentIndex)
        if (tagResult) {
            tokens.push(tagResult.token)
            currentIndex = tagResult.nextIndex
            continue
        }
        currentIndex++
    }
    return tokens
}

/**
 * 文字列中の空白とカンマをスキップし、次の有効な文字のインデックスを返す。
 *
 * @param text 対象の文字列。
 * @param startIndex 検索を開始するインデックス。
 * @returns スキップ後の新しいインデックス。
 */
const skipWhitespaceAndCommas = (text: string, startIndex: number): number => {
    let i = startIndex
    while (i < text.length && /[\s,]/.test(text[i])) {
        i++
    }
    return i
}

/**
 * LORAタグをパースする。
 * 例: `<lora:model_name:0.7>`
 *
 * @param text 対象の文字列。
 * @param startIndex 検索を開始するインデックス。
 * @returns パースされたLORAトークンと次のインデックス、またはnull。
 */
const parseLoraTag = (
    text: string,
    startIndex: number
): { token: LoraToken; nextIndex: number } | null => {
    const match = text.substring(startIndex).match(LORA_PATTERN)
    if (match) {
        const fullMatch = match[0]
        const content = match[1] || match[3]
        const weightString = match[2]
        const weight = weightString ? parseFloat(weightString) : undefined

        return {
            token: { type: "lora", content, weight },
            nextIndex: startIndex + fullMatch.length,
        }
    }
    return null
}

/**
 * グループ表現 (括弧で囲まれた重み付き表現) をパースする。
 * 例: `(tag:1.2)`, `[tag]`, `((tag))`
 * この関数は再帰的に `parseSection` を呼び出し、ネストされた重みを結合する。
 *
 * @param text 対象の文字列。
 * @param startIndex 検索を開始するインデックス。
 * @returns パースされたグループトークンと次のインデックス、またはnull。
 */
const parseGroupExpression = (
    text: string,
    startIndex: number
): { token: GroupToken; nextIndex: number } | null => {
    const openChar = text[startIndex]
    if (openChar !== "(" && openChar !== "[") return null

    if (startIndex > 0 && text[startIndex - 1] === "\\") {
        return null
    }

    const closeChar = openChar === "(" ? ")" : "]"
    let i = startIndex + 1
    let depth = 1
    const bufferArray: string[] = [] // 文字列結合を避けるために配列を使用

    while (i < text.length && depth > 0) {
        if (
            text[i] === "\\" &&
            i + 1 < text.length &&
            (text[i + 1] === "(" ||
                text[i + 1] === ")" ||
                text[i + 1] === "[" ||
                text[i + 1] === "]")
        ) {
            bufferArray.push(text[i]) // バックスラッシュ
            bufferArray.push(text[i + 1]) // エスケープ対象文字
            i += 2
            continue
        }

        if (text[i] === openChar) {
            depth++
        } else if (text[i] === closeChar) {
            depth--
        }

        if (depth > 0) {
            bufferArray.push(text[i])
        }
        i++
    }

    if (depth > 0) return null

    let contentText = bufferArray.join("").trim() // 配列を結合して文字列化
    let explicitWeight: number | undefined = undefined

    const weightMatch = contentText.match(WEIGHT_PATTERN)
    if (weightMatch) {
        contentText = weightMatch[1].trim()
        explicitWeight = parseFloat(weightMatch[2])
    }

    const contentTokens = parseSection(contentText)

    type Accumulator = { tokens: PromptToken[]; accumulatedWeight: number }

    const { tokens, accumulatedWeight } = contentTokens.reduce<Accumulator>(
        (acc, token) => {
            if (
                explicitWeight === undefined &&
                token.type === "group" &&
                token.weight !== undefined
            ) {
                return {
                    tokens: [...acc.tokens, ...token.content],
                    accumulatedWeight: acc.accumulatedWeight * token.weight,
                }
            }
            return {
                tokens: [...acc.tokens, token],
                accumulatedWeight: acc.accumulatedWeight,
            }
        },
        { tokens: [], accumulatedWeight: 1.0 } // 型アサーション不要
    )

    const defaultWeightMultiplier = openChar === "(" ? 1.1 : 0.9
    const finalWeight =
        explicitWeight !== undefined
            ? explicitWeight
            : contentTokens.length > 0
                ? accumulatedWeight * defaultWeightMultiplier
                : accumulatedWeight

    return {
        token: { type: "group", content: tokens, weight: finalWeight },
        nextIndex: i,
    }
}

/**
 * 通常のタグ (単語やフレーズ) をパースする。
 * エスケープされた括弧 (`\(`, `\)`, `\[`, `\]`) を含めて処理し、最終的にエスケープを外す。
 * 二重引用符で囲まれた単語 (`"token word"`) も1つのタグとして扱う。
 *
 * @param text 対象の文字列。
 * @param startIndex 検索を開始するインデックス。
 * @returns パースされたタグトークンと次のインデックス、またはnull。
 */
const parseRegularTag = (
    text: string,
    startIndex: number
): { token: PromptToken; nextIndex: number } | null => {
    const start = startIndex
    let i = startIndex

    if (text[i] === '"') {
        i++
        const contentStart = i
        while (i < text.length) {
            if (text[i] === "\\" && i + 1 < text.length) {
                if (
                    text[i + 1] === '"' ||
                    text[i + 1] === "(" ||
                    text[i + 1] === ")" ||
                    text[i + 1] === "[" ||
                    text[i + 1] === "]"
                ) {
                    i += 2
                } else {
                    i++
                }
            } else if (text[i] === '"') {
                const rawQuotedContent = text.substring(contentStart, i)
                i++
                const finalContent = rawQuotedContent
                    .replace(/\\"/g, '"')
                    .replace(/\\([()[\]])/g, "$1")
                return { token: { type: "tag", content: finalContent }, nextIndex: i }
            } else {
                i++
            }
        }
        return null
    }

    while (i < text.length) {
        if (
            text[i] === "\\" &&
            i + 1 < text.length &&
            (text[i + 1] === "(" ||
                text[i + 1] === ")" ||
                text[i + 1] === "[" ||
                text[i + 1] === "]")
        ) {
            i += 2
        } else if (
            text[i] === "(" ||
            text[i] === "[" ||
            text[i] === "<" ||
            text[i] === "," ||
            text[i] === '"'
        ) {
            break
        } else {
            i++
        }
    }

    const rawContent = text.substring(start, i)
    const trimmedRawContent = rawContent.trim()

    if (trimmedRawContent) {
        const finalContent = trimmedRawContent.replace(/\\([()[\]])/g, "$1")
        return {
            token: { type: "tag", content: finalContent },
            nextIndex: i,
        }
    }
    return null
}
