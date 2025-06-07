import { proxy } from "valtio"

type Store = {
    contentWarning: boolean
}

export const store = proxy<Store>({
    contentWarning: false,
})
