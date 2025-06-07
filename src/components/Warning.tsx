import { AlertDialog, Button, Flex } from "@radix-ui/themes"
import { useCallback, useEffect } from "react"
import { useSnapshot } from "valtio"
import { store } from "../store"

const localStorageKey = "くぱぁ❤"

export const Warning = () => {

    const { contentWarning } = useSnapshot(store)

    useEffect(() => {
        store.contentWarning = localStorage.getItem(localStorageKey) === null
    }, [])

    const ok = useCallback(() => {
        localStorage.setItem(localStorageKey, "true")
        store.contentWarning = false
    }, [])

    return (
        <AlertDialog.Root open={contentWarning}>
            <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>
                    エロ画像もいっぱいあるぞ！
                </AlertDialog.Title>
                <AlertDialog.Description size="2">
                    君も鬼になってみないか？<br />
                    それはそれとして18歳未満は見ちゃダメだぞ！
                </AlertDialog.Description>
                <Flex
                    gap="3"
                    mt="4"
                    align="stretch"
                    justify="center"
                    direction={{
                        initial: "column",
                        md: "row"
                    }}
                >
                    <AlertDialog.Cancel>
                        <Button
                            variant="soft"
                            color="gray"
                            onClick={() => window.location.href = "//www.google.com"}
                        >
                            私は18歳未満です - 出口
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                        <Button
                            variant="solid"
                            color="orange"
                            onClick={ok}
                        >
                            私は18歳以上です - 入力
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    )
}
