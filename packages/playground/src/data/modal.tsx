import { createProviderConsumer } from '@stencil/state-tunnel';

export interface ModalState {
  modal: string,
  setModal?: (modal: string) => void
}

export default createProviderConsumer<ModalState>({
    modal: ""
  },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);