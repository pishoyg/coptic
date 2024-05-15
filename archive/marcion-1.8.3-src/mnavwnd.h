#ifndef MNAVWND_H
#define MNAVWND_H

#include <QWidget>
#include <QPixmap>
#include <QApplication>
#include <QDesktopWidget>
#include <QMouseEvent>
#include <QPainter>

namespace Ui {
class MNavWnd;
}

class MNavWnd : public QWidget
{
    Q_OBJECT

public:
    explicit MNavWnd(QPixmap const * pixmap,double x_percent,double y_percent,QWidget *parent = 0);
    ~MNavWnd();

private:
    Ui::MNavWnd *ui;
    QPixmap _pixmap;

    void updatePixmap(QPoint p);
protected:
    void mousePressEvent(QMouseEvent * event);
    void keyPressEvent(QKeyEvent * event);
signals:
    void navigate(double x_percent,double y_percent);
};

#endif // MNAVWND_H
