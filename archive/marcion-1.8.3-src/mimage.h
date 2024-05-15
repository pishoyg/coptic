/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#ifndef MIMAGE_H
#define MIMAGE_H
//
#include <QGraphicsView>
#include <QGraphicsItem>
#include <QGraphicsScene>
#include <QMouseEvent>
#include <QPixmap>
#include <QMenu>
#include <QAction>
#include <QClipboard>
#include <QMatrix>
#include <QBrush>
#include <QBitmap>
#include <QApplication>

#include "messages.h"
#include "settings.h"
#include "mnavwnd.h"

//

class CMImage : public QGraphicsView
{
    friend class MImageWidget;
Q_OBJECT
public:
    enum ImageMode{Image,Pdf,Map};
    enum MouseMode{Move,Select};
    enum CopyTextTarget{Clip,Dict,Conv};
    enum SelMoveMode{Normal,LeftTop,LeftBottom,RightTop,RightBottom};
        CMImage(QWidget * parent = 0);
        ~CMImage();
        //void init(CMessages * const messages);
        bool loadPage(QString const &,qreal,qreal rotate=0);
        void setPixmap(QPixmap const &);
        QPixmap const & getPixmap() const {return pixmap;}
        QPixmap const * ptrPixmap() const {return &pixmap;}
        void clearPixmap();
        void deleteNavigator();
        void scale(qreal zoom,qreal angle=0);
        void showPopupOnButton(QAbstractButton * button);
        QGraphicsScene * grScene(){return &scene;}
        //void enablePdfMenu();
        void setMouseMode(MouseMode,bool signal=true);
        void setSettingsState(bool);
        void setSelectionBorderColor(QColor const &);
        void setSelectionBorderWidth(int);
        void setSelectionFillColor(QColor const &);
        //void setSelectionFillOpacity(int);
        void cancelSelection();
        QRect selectionRect() const {return selection.toRect();}
        QRectF selectionRectF() const {return selection;}

        void setImageMode(ImageMode imode,QAbstractButton * find_button=0);
        ImageMode imageMode(){return _i_mode;}
        //void rotate(qreal);

        QSizeF currentPageSize() const;
        void copyImage(),clearSelection();
        void grid(bool show);
        void enableGrid(bool enable);

        void setNavButton(QAbstractButton * button,MNavWnd ** w) {_nav_butt=button; _w=w;}
        void selectAll();
protected:
	void mousePressEvent ( QMouseEvent * e );
	void mouseMoveEvent ( QMouseEvent * e );
	void mouseReleaseEvent ( QMouseEvent * e );
    void keyPressEvent ( QKeyEvent * e );
private:
	QPointF start;
	QGraphicsScene scene;
	QGraphicsItem * current;
        //QSize _cur_size;
        QGraphicsRectItem * sel_rect;
        QPixmap pixmap;

        MButtonMenu popup;
        QMenu popupSel;

        QRectF selection;
        QPen sel_pen;
        QBrush sel_brush;

        MouseMode _m_mode;
        SelMoveMode _s_mode;
        ImageMode _i_mode;

        QActionGroup agrp,agrpSel;

        QList<QGraphicsLineItem*> _grid;
        bool _grid_enabled;

        QAction * a_move,*a_select,*a_select_all,*a_copy,*a_copy_text,*a_dictionary,*a_conv,*a_clr_selection,*a_repaint,*a_sett,*a_links,*a_fonts,*a_find,*a_zoomplus,*a_zoomminus,*a_navigate;
        QAction *a_sel_lt,*a_sel_lb,*a_sel_rt,*a_sel_rb,*a_sel_norm;
        QAbstractButton * _findbutt,*_nav_butt;
        MNavWnd ** _w;
private slots:
        void slot_customContextMenuRequested(QPoint);
signals:
        void positionChanged(QPointF);
        void copyTextRequested(QRectF,int);
        void showLinksRequested();
        void showFontsRequested();
        //void findTextRequested();
        void mouseModeChanged(int);
        void settingsActivated(bool);
        void resizeRequested(bool smaller);
        void beforeSceneResized();
        void afterSceneResized();
        void selectionChanged(QRectF selection);
};
#endif
