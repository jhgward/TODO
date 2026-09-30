import type { ReactNode } from 'react';

type BoardLayoutProps = {
  children: ReactNode;
};

const BoardLayout = ({ children }: BoardLayoutProps) => <>{children}</>;

export default BoardLayout;
